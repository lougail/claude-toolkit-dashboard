import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { ProjectState } from '@/lib/types'

/**
 * Read and parse a project's state.json
 * Returns null if the file doesn't exist or is invalid
 */
export async function parseState(projectPath: string): Promise<ProjectState | null> {
  const statePath = join(projectPath, '.claude', 'state.json')

  try {
    const raw = await readFile(statePath, 'utf-8')
    const data = JSON.parse(raw) as ProjectState

    // Skip template files (contain placeholders)
    if (data.project?.includes('{{')) return null

    return data
  } catch {
    return null
  }
}
