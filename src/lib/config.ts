import { join } from 'node:path'
import { homedir } from 'node:os'
import { stat, readFile, writeFile, mkdir, readdir } from 'node:fs/promises'
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

/** A directory reached while decoding, and the encoded text still to match below it */
interface DecodedPrefix {
  directory: string
  encodedRest: string
}

const LETTER_OR_DIGIT = /^[a-zA-Z0-9]$/

/**
 * Decode an encoded project path from ~/.claude/projects/
 * Claude Code names each entry after the working directory, with every character
 * that is not a letter or a digit replaced by "-".
 * e.g. "/Users/louis/.claude" → "-Users-louis--claude"
 *
 * A "-" can therefore stand for "/", ".", "_", a space or a real hyphen. The decoder
 * walks the real directories and keeps, at each level, the names the encoded text can
 * stand for. It backs up when a name leads nowhere: ".claude" and ".claude-mem" both
 * open "-claude-mem-sessions". When the project directory is gone, the text that
 * matched no directory is returned as one directory name.
 */
export async function decodeProjectPath(encoded: string): Promise<string | null> {
  // Validate input: must start with "-" and have meaningful content
  if (!encoded.startsWith('-') || encoded.length < 2) return null

  const deepest = await findDeepestDirectory('/', encoded.slice(1))
  const result =
    deepest.encodedRest === ''
      ? deepest.directory
      : join(deepest.directory, guessDirectoryName(deepest.encodedRest))

  // Safety: reject paths that decode to dangerous locations
  // Valid project paths should have at least 3 segments (e.g. /Users/x/project)
  const segments = result.split('/').filter(Boolean)
  if (segments.length < 3) return null

  return result
}

/** Follow the encoded text down the real directories, as far as it matches */
async function findDeepestDirectory(directory: string, encodedRest: string): Promise<DecodedPrefix> {
  let deepest: DecodedPrefix = { directory, encodedRest }
  if (encodedRest === '') return deepest

  for (const name of await findEncodedDirectories(directory, encodedRest)) {
    // Skip the name and the "-" that stands for the "/" after it
    const reached = await findDeepestDirectory(join(directory, name), encodedRest.slice(name.length + 1))
    if (reached.encodedRest === '') return reached
    if (reached.encodedRest.length < deepest.encodedRest.length) deepest = reached
  }
  return deepest
}

/** The directories whose name the start of the encoded text can stand for, shortest name first */
async function findEncodedDirectories(directory: string, encodedRest: string): Promise<string[]> {
  let names: string[]
  try {
    names = await readdir(directory)
  } catch {
    return []
  }

  const directories: string[] = []
  for (const name of names) {
    if (startsWithEncodedName(encodedRest, name) && (await isDirectory(join(directory, name)))) {
      directories.push(name)
    }
  }
  return directories.sort((a, b) => a.length - b.length || a.localeCompare(b))
}

/** True when the encoded text opens with this name, alone or followed by a "-" and more text */
function startsWithEncodedName(encodedRest: string, name: string): boolean {
  for (let index = 0; index < name.length; index++) {
    const standsForCharacter =
      encodedRest[index] === name[index] || (encodedRest[index] === '-' && !LETTER_OR_DIGIT.test(name[index]))
    if (!standsForCharacter) return false
  }

  const isWholeText = encodedRest.length === name.length
  // A working directory never ends with "/", so a "-" that closes the text belongs to a name
  const isFollowedByPath = encodedRest[name.length] === '-' && encodedRest.length > name.length + 1
  return isWholeText || isFollowedByPath
}

/** A name for a directory that is gone. A leading "-" is read as the dot of a hidden directory, the common case */
function guessDirectoryName(encodedRest: string): string {
  return encodedRest.replace(/^-/, '.')
}

/**
 * Extract a human-readable project name from a decoded path
 */
export function projectName(decodedPath: string): string {
  return decodedPath.split('/').filter(Boolean).pop() ?? decodedPath
}
