import { join } from 'node:path'
import { homedir } from 'node:os'
import { stat, readFile, writeFile, mkdir } from 'node:fs/promises'
import type { DashboardConfig } from '@/lib/types'

const home = homedir()

export const CLAUDE_HOME = join(home, '.claude')
export const PROJECTS_DIR = join(CLAUDE_HOME, 'projects')
export const HISTORY_FILE = join(CLAUDE_HOME, 'history.jsonl')
export const TASKS_DIR = join(CLAUDE_HOME, 'tasks')

const CONFIG_DIR = join(CLAUDE_HOME, 'dashboard')
const CONFIG_FILE = join(CONFIG_DIR, 'config.json')

const DEFAULT_CONFIG: DashboardConfig = {
  projectDirs: [join(home, 'Developer')],
  excludePatterns: ['node_modules', '.git', 'dist', 'build', '.next'],
  scanClaudeProjects: true,
}

/**
 * Read dashboard config from ~/.claude/dashboard/config.json
 * Returns default config if file doesn't exist
 */
export async function readDashboardConfig(): Promise<DashboardConfig> {
  try {
    const raw = await readFile(CONFIG_FILE, 'utf-8')
    const parsed: unknown = JSON.parse(raw)
    return validateConfig(parsed)
  } catch {
    return { ...DEFAULT_CONFIG }
  }
}

/**
 * Write dashboard config to ~/.claude/dashboard/config.json
 */
export async function writeDashboardConfig(config: DashboardConfig): Promise<void> {
  const validated = validateConfig(config)
  await mkdir(CONFIG_DIR, { recursive: true })
  await writeFile(CONFIG_FILE, JSON.stringify(validated, null, 2), 'utf-8')
}

function validateConfig(raw: unknown): DashboardConfig {
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_CONFIG }
  const obj = raw as Record<string, unknown>

  return {
    projectDirs: Array.isArray(obj.projectDirs)
      ? obj.projectDirs.filter((d): d is string => typeof d === 'string' && d.startsWith('/'))
      : DEFAULT_CONFIG.projectDirs,
    excludePatterns: Array.isArray(obj.excludePatterns)
      ? obj.excludePatterns.filter((p): p is string => typeof p === 'string')
      : DEFAULT_CONFIG.excludePatterns,
    scanClaudeProjects: typeof obj.scanClaudeProjects === 'boolean'
      ? obj.scanClaudeProjects
      : DEFAULT_CONFIG.scanClaudeProjects,
  }
}

async function isDirectory(path: string): Promise<boolean> {
  try {
    const s = await stat(path)
    return s.isDirectory()
  } catch {
    return false
  }
}

/**
 * Decode an encoded project path from ~/.claude/projects/
 * Claude Code encodes paths by replacing "/" with "-".
 * e.g. "-Users-louis-Developer-hello-mira" → "/Users/louis/Developer/hello-mira"
 *
 * The challenge: "-" is ambiguous (directory separator vs literal hyphen).
 * We resolve by greedily checking which segments exist as directories.
 */
export async function decodeProjectPath(encoded: string): Promise<string | null> {
  // Validate input: must start with "-" and have meaningful content
  if (!encoded.startsWith('-') || encoded.length < 2) return null

  const raw = encoded.slice(1)
  const parts = raw.split('-')

  let currentPath = '/'
  let segment = parts[0] ?? ''

  for (let i = 1; i < parts.length; i++) {
    const testDir = currentPath + segment
    if (await isDirectory(testDir)) {
      currentPath = testDir + '/'
      segment = parts[i] ?? ''
    } else {
      segment += '-' + parts[i]
    }
  }

  const result = currentPath + segment

  // Safety: reject paths that decode to dangerous locations
  // Valid project paths should have at least 3 segments (e.g. /Users/x/project)
  const segments = result.split('/').filter(Boolean)
  if (segments.length < 3) return null

  return result
}

/**
 * Extract a human-readable project name from a decoded path
 */
export function projectName(decodedPath: string): string {
  return decodedPath.split('/').filter(Boolean).pop() ?? decodedPath
}
