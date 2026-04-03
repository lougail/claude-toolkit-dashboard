// --- State (from .claude/state.json) ---

export interface ProjectState {
  project: string
  updatedAt: string
  features: Feature[]
  decisions: {
    pending: number
    validated: number
    rejected: number
  }
  lastSession: {
    date: string | null
    branch: string | null
    lastAction: string | null
    nextStep: string | null
  }
}

/** All 6 phases of the feature workflow */
export type FeatureStatus = 'idea' | 'prd' | 'building' | 'review' | 'ship' | 'done'

/** Legacy statuses from v1 state.json files */
export type LegacyFeatureStatus = 'planning' | 'in-progress' | 'shipped'

export interface Feature {
  slug: string
  status: FeatureStatus
  prd: string | null
  ralph: {
    active: boolean
    branch: string | null
    storiesTotal: number
    storiesDone: number
  }
  audit: {
    lastDate: string | null
    score: number | null
    blockers: number
  }
  pr: number | null
  shipped: boolean
}

// --- Sessions (from ~/.claude/history.jsonl) ---

export interface SessionEntry {
  display: string
  timestamp: number
  project: string
  sessionId: string
}

// --- Agent messages (from subagent JSONL files) ---

export interface AgentMessage {
  type: 'user' | 'assistant'
  sessionId: string
  version: string
  gitBranch: string
  agentId: string
  timestamp: string
  message: {
    role: string
    content: string | Array<{ type: string; text?: string }>
    model?: string
    usage?: {
      input_tokens: number
      output_tokens: number
    }
  }
}

// --- Tasks (from ~/.claude/tasks/{team-uuid}/*.json) ---

export interface Task {
  id: string
  subject: string
  description: string
  activeForm: string
  status: 'pending' | 'in_progress' | 'completed' | 'deleted'
  owner: string
  blocks: string[]
  blockedBy: string[]
}

// --- Vault entries (parsed from vault/**/*.md) ---

export interface VaultEntry {
  title: string
  date: string
  type: 'idea' | 'decision' | 'insight' | 'research' | 'journal' | 'unknown'
  status?: string
  content: string
  path: string
}

// --- Project health ---

export interface ProjectHealth {
  hasState: boolean
  hasVault: boolean
  hasSteering: boolean
  hasTests: boolean
  hasCI: boolean
  score: number // 0-100
  label: 'healthy' | 'partial' | 'minimal'
}

// --- Git info (live from filesystem) ---

/** CI status detected from .github/workflows + gh CLI */
export type CIStatus = 'passing' | 'failing' | 'pending' | 'configured' | 'none'

export interface GitInfo {
  branch: string | null
  dirtyCount: number
  ciStatus: CIStatus
}

// --- Aggregated project data ---

export interface Project {
  name: string
  path: string
  encodedPath: string
  state: ProjectState | null
  recentSessions: SessionEntry[]
  vaultEntries: VaultEntry[]
  features: Feature[]
  health: ProjectHealth
  git: GitInfo
}

// --- Ralph session tracking ---

export interface RalphSession {
  projectName: string
  projectPath: string
  status: 'running' | 'completed' | 'blocked' | 'unknown'
  loopCount: number
  tasksDone: number
  tasksTotal: number
  lastAction: string | null
  timestamp: string | null
  liveLog: string[]
}

// --- Dashboard configuration ---

export interface DashboardConfig {
  /** Directories to scan for projects (absolute paths) */
  projectDirs: string[]
  /** Glob patterns to exclude from scanning */
  excludePatterns: string[]
  /** Whether to also scan ~/.claude/projects/ (default: true) */
  scanClaudeProjects: boolean
}

// --- Dashboard metrics ---

export interface DashboardMetrics {
  totalProjects: number
  totalFeatures: number
  activeFeatures: number
  shippedFeatures: number
  pendingDecisions: number
  totalSessions: number
  recentSessions: SessionEntry[]
  tokenUsage: {
    date: string
    input: number
    output: number
  }[]
}
