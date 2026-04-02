import { join } from 'node:path'
import { homedir } from 'node:os'

const home = homedir()

export const CLAUDE_HOME = join(home, '.claude')
export const PROJECTS_DIR = join(CLAUDE_HOME, 'projects')
export const HISTORY_FILE = join(CLAUDE_HOME, 'history.jsonl')
export const TASKS_DIR = join(CLAUDE_HOME, 'tasks')

/**
 * Decode an encoded project path from ~/.claude/projects/
 * e.g. "-Users-louis-Developer-hello-mira" → "/Users/louis/Developer/hello-mira"
 */
export function decodeProjectPath(encoded: string): string {
  // The encoding replaces "/" with "-"
  // We rebuild the path by replacing "-" with "/" and checking existence
  return encoded.replace(/^-/, '/').replace(/-/g, '/')
}

/**
 * Extract a human-readable project name from a decoded path
 */
export function projectName(decodedPath: string): string {
  return decodedPath.split('/').filter(Boolean).pop() ?? decodedPath
}
