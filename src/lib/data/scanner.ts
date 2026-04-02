import { readdir, stat, access } from 'node:fs/promises'
import { join } from 'node:path'
import {
  PROJECTS_DIR,
  HISTORY_FILE,
  TASKS_DIR,
  decodeProjectPath,
  projectName,
} from '@/lib/config'
import { parseState } from '@/lib/parsers/state'
import { parseHistory, parseAgentMessages, aggregateTokenUsage } from '@/lib/parsers/jsonl'
import { parseVault } from '@/lib/parsers/markdown'
import type {
  Project,
  ProjectHealth,
  DashboardMetrics,
  SessionEntry,
  AgentMessage,
  Task,
} from '@/lib/types'

function isTask(v: unknown): v is Task {
  if (!v || typeof v !== 'object') return false
  const t = v as Record<string, unknown>
  return (
    typeof t.id === 'string' &&
    typeof t.subject === 'string' &&
    typeof t.status === 'string'
  )
}

async function exists(path: string): Promise<boolean> {
  try {
    await access(path)
    return true
  } catch {
    return false
  }
}

/**
 * Discover all projects registered in ~/.claude/projects/
 */
export async function discoverProjects(): Promise<Project[]> {
  if (!(await exists(PROJECTS_DIR))) return []

  const entries = await readdir(PROJECTS_DIR, { withFileTypes: true })
  const projectDirs = entries.filter((e) => e.isDirectory())

  const projectResults = await Promise.all(
    projectDirs.map(async (dir) => {
      const encodedPath = dir.name
      const decodedPath = await decodeProjectPath(encodedPath)

      // Skip entries that failed to decode (invalid encoding)
      if (!decodedPath) return null

      const name = projectName(decodedPath)

      // Try to read state.json from the actual project directory
      const projectExists = await exists(decodedPath)
      const state = projectExists ? await parseState(decodedPath) : null

      // Read vault entries from the project
      const vaultPath = join(decodedPath, 'vault')
      const vaultEntries = projectExists ? await parseVault(vaultPath) : []

      // Compute project health
      const hasState = state !== null
      const hasVault = vaultEntries.length > 0
      const hasSteering = projectExists && await exists(join(decodedPath, 'steering', 'product.md'))
      const hasTests = projectExists && (
        await exists(join(decodedPath, 'vitest.config.ts')) ||
        await exists(join(decodedPath, 'jest.config.ts')) ||
        await exists(join(decodedPath, 'jest.config.js'))
      )

      const checks = [hasState, hasVault, hasSteering, hasTests]
      const healthScore = Math.round((checks.filter(Boolean).length / checks.length) * 100)
      const health: ProjectHealth = {
        hasState,
        hasVault,
        hasSteering,
        hasTests,
        score: healthScore,
        label: healthScore >= 75 ? 'healthy' : healthScore >= 50 ? 'partial' : 'minimal',
      }

      return {
        name,
        path: decodedPath,
        encodedPath,
        state,
        recentSessions: [] as SessionEntry[],
        vaultEntries,
        features: state?.features ?? [],
        health,
      }
    })
  )

  const projects = projectResults.filter((p): p is NonNullable<typeof p> => p !== null)

  // Enrich with session data from history
  const allSessions = await parseHistory(HISTORY_FILE)

  for (const project of projects) {
    project.recentSessions = allSessions
      .filter((s) => s.project === project.path)
      .slice(0, 20)
  }

  return projects.sort((a, b) => {
    // Sort by most recently active
    const aTime = a.recentSessions[0]?.timestamp ?? 0
    const bTime = b.recentSessions[0]?.timestamp ?? 0
    return bTime - aTime
  })
}

/**
 * Read all tasks from ~/.claude/tasks/
 */
export async function readTasks(): Promise<Task[]> {
  if (!(await exists(TASKS_DIR))) return []

  const tasks: Task[] = []

  try {
    const teamDirs = await readdir(TASKS_DIR, { withFileTypes: true })

    for (const teamDir of teamDirs) {
      if (!teamDir.isDirectory()) continue
      const teamPath = join(TASKS_DIR, teamDir.name)
      const files = await readdir(teamPath)

      for (const file of files) {
        if (!file.endsWith('.json')) continue
        try {
          const { readFile } = await import('node:fs/promises')
          const raw = await readFile(join(teamPath, file), 'utf-8')
          const data: unknown = JSON.parse(raw)
          if (isTask(data)) {
            tasks.push(data)
          }
        } catch {
          // skip invalid files
        }
      }
    }
  } catch {
    // tasks dir doesn't exist or is empty
  }

  return tasks
}

/**
 * Collect all agent messages across all project sessions for token usage
 */
const MAX_AGENT_MESSAGES = 50_000

export async function collectAgentMessages(
  limitDays = 30
): Promise<AgentMessage[]> {
  if (!(await exists(PROJECTS_DIR))) return []

  const cutoff = Date.now() - limitDays * 24 * 60 * 60 * 1000
  const allMessages: AgentMessage[] = []

  try {
    const projectDirs = await readdir(PROJECTS_DIR, { withFileTypes: true })

    for (const projectDir of projectDirs) {
      if (!projectDir.isDirectory()) continue
      const projectPath = join(PROJECTS_DIR, projectDir.name)

      const sessionDirs = await readdir(projectPath, {
        withFileTypes: true,
      }).catch(() => [])

      for (const sessionDir of sessionDirs) {
        if (!sessionDir.isDirectory()) continue
        const subagentsPath = join(projectPath, sessionDir.name, 'subagents')

        if (!(await exists(subagentsPath))) continue

        const agentFiles = await readdir(subagentsPath).catch(() => [])

        for (const agentFile of agentFiles) {
          if (!agentFile.endsWith('.jsonl')) continue

          const filePath = join(subagentsPath, agentFile)
          const fileStat = await stat(filePath).catch(() => null)

          // Skip old files
          if (fileStat && fileStat.mtimeMs < cutoff) continue

          const messages = await parseAgentMessages(filePath)
          allMessages.push(...messages)

          // Cap memory usage
          if (allMessages.length >= MAX_AGENT_MESSAGES) break
        }
        if (allMessages.length >= MAX_AGENT_MESSAGES) break
      }
      if (allMessages.length >= MAX_AGENT_MESSAGES) break
    }
  } catch {
    // gracefully handle
  }

  return allMessages
}

/**
 * Build dashboard metrics from all available data.
 * Accepts pre-loaded projects to avoid redundant filesystem scans.
 */
export async function getDashboardMetrics(
  preloadedProjects?: Project[]
): Promise<DashboardMetrics> {
  const [projects, allSessions, agentMessages] = await Promise.all([
    preloadedProjects ?? discoverProjects(),
    parseHistory(HISTORY_FILE),
    collectAgentMessages(30),
  ])

  const allFeatures = projects.flatMap((p) => p.features)

  return {
    totalProjects: projects.length,
    totalFeatures: allFeatures.length,
    activeFeatures: allFeatures.filter((f) => f.status === 'in-progress')
      .length,
    shippedFeatures: allFeatures.filter((f) => f.shipped).length,
    pendingDecisions: projects.reduce(
      (sum, p) => sum + (p.state?.decisions.pending ?? 0),
      0
    ),
    totalSessions: allSessions.length,
    recentSessions: allSessions.slice(0, 50),
    tokenUsage: aggregateTokenUsage(agentMessages),
  }
}
