import { readdir, stat, access } from 'node:fs/promises'
import { execFile } from 'node:child_process'
import { join } from 'node:path'
import {
  PROJECTS_DIR,
  HISTORY_FILE,
  TASKS_DIR,
  decodeProjectPath,
  projectName,
  readDashboardConfig,
} from '@/lib/config'
import { parseState } from '@/lib/parsers/state'
import { parseHistory, parseAgentMessages, aggregateTokenUsage } from '@/lib/parsers/jsonl'
import { parseVault } from '@/lib/parsers/markdown'
import type {
  Project,
  ProjectHealth,
  GitInfo,
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

function execGit(args: string[], cwd: string): Promise<string> {
  return new Promise((resolve) => {
    execFile('git', args, { cwd, timeout: 3000 }, (err, stdout) => {
      resolve(err ? '' : stdout.trim())
    })
  })
}

async function getGitInfo(projectPath: string): Promise<GitInfo> {
  const [branch, statusOutput] = await Promise.all([
    execGit(['rev-parse', '--abbrev-ref', 'HEAD'], projectPath),
    execGit(['status', '--porcelain', '--untracked-files=no'], projectPath),
  ])

  return {
    branch: branch || null,
    dirtyCount: statusOutput ? statusOutput.split('\n').length : 0,
  }
}

/**
 * Build a Project object from a decoded filesystem path
 */
async function buildProject(decodedPath: string, encodedPath: string): Promise<Project | null> {
  const name = projectName(decodedPath)
  const projectExists = await exists(decodedPath)

  const [state, vaultEntries, git] = await Promise.all([
    projectExists ? parseState(decodedPath) : Promise.resolve(null),
    projectExists ? parseVault(join(decodedPath, 'vault')) : Promise.resolve([]),
    projectExists ? getGitInfo(decodedPath) : Promise.resolve({ branch: null, dirtyCount: 0 }),
  ])

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
    git,
  }
}

/**
 * Scan configured directories for git repos (one level deep)
 */
async function scanConfiguredDirs(
  dirs: string[],
  excludePatterns: string[],
  knownPaths: Set<string>
): Promise<Project[]> {
  const results: Project[] = []

  for (const dir of dirs) {
    if (!(await exists(dir))) continue

    let entries
    try {
      entries = await readdir(dir, { withFileTypes: true })
    } catch {
      continue
    }

    const candidates = entries.filter((e) => {
      if (!e.isDirectory()) return false
      if (excludePatterns.includes(e.name)) return false
      return true
    })

    const projects = await Promise.all(
      candidates.map(async (entry) => {
        const fullPath = join(dir, entry.name)
        if (knownPaths.has(fullPath)) return null

        // Only include if it's a git repo
        const isGitRepo = await exists(join(fullPath, '.git'))
        if (!isGitRepo) return null

        const encoded = fullPath.replace(/\//g, '-')
        return buildProject(fullPath, encoded)
      })
    )

    for (const p of projects) {
      if (p) results.push(p)
    }
  }

  return results
}

/**
 * Discover all projects from ~/.claude/projects/ and configured directories
 */
export async function discoverProjects(): Promise<Project[]> {
  const config = await readDashboardConfig()

  // 1. Discover from ~/.claude/projects/
  let claudeProjects: Project[] = []
  if (config.scanClaudeProjects && await exists(PROJECTS_DIR)) {
    const entries = await readdir(PROJECTS_DIR, { withFileTypes: true })
    const projectDirs = entries.filter((e) => e.isDirectory())

    const projectResults = await Promise.all(
      projectDirs.map(async (dir) => {
        const encodedPath = dir.name
        const decodedPath = await decodeProjectPath(encodedPath)
        if (!decodedPath) return null
        return buildProject(decodedPath, encodedPath)
      })
    )
    claudeProjects = projectResults.filter((p): p is NonNullable<typeof p> => p !== null)
  }

  // 2. Scan configured directories for additional git repos
  const knownPaths = new Set(claudeProjects.map((p) => p.path))
  const scannedProjects = await scanConfiguredDirs(
    config.projectDirs,
    config.excludePatterns,
    knownPaths
  )

  const projects = [...claudeProjects, ...scannedProjects]

  // Enrich with session data from history
  const allSessions = await parseHistory(HISTORY_FILE)

  for (const project of projects) {
    project.recentSessions = allSessions
      .filter((s) => s.project === project.path)
      .slice(0, 20)
  }

  return projects.sort((a, b) => {
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
    await scanAgentFiles(cutoff, allMessages)
  } catch {
    // gracefully handle
  }

  return allMessages
}

async function scanAgentFiles(
  cutoff: number,
  out: AgentMessage[]
): Promise<void> {
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

        if (fileStat && fileStat.mtimeMs < cutoff) continue

        const messages = await parseAgentMessages(filePath)
        out.push(...messages)

        if (out.length >= MAX_AGENT_MESSAGES) return
      }
    }
  }
}

/**
 * Build dashboard metrics from all available data.
 * Accepts pre-loaded projects to avoid redundant filesystem scans.
 * When preloadedProjects is provided, session counts are derived from
 * the already-enriched project.recentSessions (set by discoverProjects).
 */
export async function getDashboardMetrics(
  preloadedProjects?: Project[]
): Promise<DashboardMetrics> {
  const [projects, agentMessages] = await Promise.all([
    preloadedProjects ?? discoverProjects(),
    collectAgentMessages(30),
  ])

  // When projects are preloaded, derive sessions from them to avoid
  // re-parsing history.jsonl. Only parse fresh if no preloaded projects.
  const allSessions = preloadedProjects
    ? deduplicateSessions(projects.flatMap((p) => p.recentSessions))
    : await parseHistory(HISTORY_FILE)

  const allFeatures = projects.flatMap((p) => p.features)

  return {
    totalProjects: projects.length,
    totalFeatures: allFeatures.length,
    activeFeatures: allFeatures.filter((f) => f.status === 'building' || f.status === 'review')
      .length,
    shippedFeatures: allFeatures.filter((f) => f.status === 'done' || f.status === 'ship').length,
    pendingDecisions: projects.reduce(
      (sum, p) => sum + (p.state?.decisions.pending ?? 0),
      0
    ),
    totalSessions: allSessions.length,
    recentSessions: allSessions.slice(0, 50),
    tokenUsage: aggregateTokenUsage(agentMessages),
  }
}

function deduplicateSessions(sessions: SessionEntry[]): SessionEntry[] {
  const seen = new Set<string>()
  return sessions
    .filter((s) => {
      if (seen.has(s.sessionId)) return false
      seen.add(s.sessionId)
      return true
    })
    .sort((a, b) => b.timestamp - a.timestamp)
}
