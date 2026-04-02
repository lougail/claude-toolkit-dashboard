import { join } from 'node:path'
import { homedir } from 'node:os'
import { stat } from 'node:fs/promises'

const home = homedir()

export const CLAUDE_HOME = join(home, '.claude')
export const PROJECTS_DIR = join(CLAUDE_HOME, 'projects')
export const HISTORY_FILE = join(CLAUDE_HOME, 'history.jsonl')
export const TASKS_DIR = join(CLAUDE_HOME, 'tasks')

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
export async function decodeProjectPath(encoded: string): Promise<string> {
  // Remove leading dash (root /)
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

  // Final path: currentPath + last segment (the project folder itself)
  return currentPath + segment
}

/**
 * Extract a human-readable project name from a decoded path
 */
export function projectName(decodedPath: string): string {
  return decodedPath.split('/').filter(Boolean).pop() ?? decodedPath
}
