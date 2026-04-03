import { readFile, access } from 'node:fs/promises'
import { join } from 'node:path'
import type { RalphSession } from '@/lib/types'

async function exists(path: string): Promise<boolean> {
  try {
    await access(path)
    return true
  } catch {
    return false
  }
}

interface RalphStatusJson {
  status?: string
  loop_count?: number
  last_action?: string
  timestamp?: string
}

function countCheckboxes(markdown: string): { done: number; total: number } {
  const checked = (markdown.match(/- \[x\]/gi) ?? []).length
  const unchecked = (markdown.match(/- \[ \]/g) ?? []).length
  return { done: checked, total: checked + unchecked }
}

/**
 * Read Ralph session data from a project's .ralph/ directory.
 * Returns null if no .ralph/ directory exists.
 */
export async function parseRalphSession(
  projectPath: string,
  projectName: string
): Promise<RalphSession | null> {
  const ralphDir = join(projectPath, '.ralph')
  if (!(await exists(ralphDir))) return null

  // Read status.json
  let statusData: RalphStatusJson = {}
  try {
    const raw = await readFile(join(ralphDir, 'status.json'), 'utf-8')
    statusData = JSON.parse(raw) as RalphStatusJson
  } catch {
    // no status.json or invalid
  }

  // Count tasks from fix_plan.md
  let tasksDone = 0
  let tasksTotal = 0
  try {
    const fixPlan = await readFile(join(ralphDir, 'fix_plan.md'), 'utf-8')
    const counts = countCheckboxes(fixPlan)
    tasksDone = counts.done
    tasksTotal = counts.total
  } catch {
    // no fix_plan.md
  }

  // Read last lines of live.log
  const liveLog: string[] = []
  try {
    const log = await readFile(join(ralphDir, 'live.log'), 'utf-8')
    const lines = log.trim().split('\n').filter(Boolean)
    liveLog.push(...lines.slice(-8))
  } catch {
    // no live.log
  }

  const status = normalizeStatus(statusData.status)

  return {
    projectName,
    projectPath,
    status,
    loopCount: statusData.loop_count ?? 0,
    tasksDone,
    tasksTotal,
    lastAction: statusData.last_action ?? null,
    timestamp: statusData.timestamp ?? null,
    liveLog,
  }
}

function normalizeStatus(raw: string | undefined): RalphSession['status'] {
  if (!raw) return 'unknown'
  if (raw === 'running' || raw === 'executing') return 'running'
  if (raw === 'completed' || raw === 'done') return 'completed'
  if (raw === 'blocked' || raw === 'error') return 'blocked'
  return 'unknown'
}

/**
 * Discover all Ralph sessions across discovered projects.
 */
export async function discoverRalphSessions(
  projects: { name: string; path: string }[]
): Promise<RalphSession[]> {
  const results = await Promise.all(
    projects.map((p) => parseRalphSession(p.path, p.name))
  )
  return results.filter((r): r is RalphSession => r !== null)
}
