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
  hasAudit: boolean
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
  openPRs: number
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
  lastActivity: number | null // epoch ms from latest git commit
  /** PLAN.md, JOURNAL.md and decisions, with the gaps when the project directory or a file is missing */
  dossier: Dossier
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

// --- Alerts ---

export type AlertSeverity = 'error' | 'warning' | 'info'

export interface Alert {
  id: string
  severity: AlertSeverity
  title: string
  detail: string | null
  project: string
  timestamp: number
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

// --- Dossier (PLAN.md, JOURNAL.md and decisions kept by the agents in each project) ---

/** A labelled bullet, written "- **Fait.** text" in the plan state or in a journal entry */
export interface DossierPoint {
  label: string
  text: string
  taskNumbers: number[]
}

export type DossierTaskStatus = 'todo' | 'in_progress' | 'to_validate' | 'done' | 'later' | 'unknown'

export interface DossierTask {
  number: number
  title: string
  description: string
  doneWhen: string
  status: DossierTaskStatus
  statusText: string
  /** The name written after "à valider par", as written. null for another status or without a name */
  validator: string | null
  /** The date written after "fait le", as YYYY-MM-DD. null for another status or without a readable date */
  doneOn: string | null
  /** The text written after that date, without the punctuation around it. null without a date or without a proof */
  proof: string | null
}

export interface DossierWaitingItem {
  position: number
  text: string
  requestedOn: string | null
  /** Who is expected to answer: the name written after the date, otherwise the name ending the section heading */
  addressee: string | null
  taskNumbers: number[]
}

export interface DossierPlan {
  stateDate: string | null
  state: DossierPoint[]
  tasks: DossierTask[]
  waiting: DossierWaitingItem[]
}

export interface DossierJournalEntry {
  date: string
  note: string | null
  points: DossierPoint[]
}

export interface DossierDecision {
  id: string | null
  title: string
  date: string | null
  status: string | null
  path: string
}

export type DossierGapKind =
  | 'missing_file'
  | 'unreadable_file'
  | 'empty_file'
  | 'missing_title'
  | 'missing_section'
  | 'missing_state_date'
  | 'point_without_label'
  | 'unreadable_tasks_table'
  | 'unreadable_task_row'
  | 'task_without_done_when'
  | 'unknown_status'
  | 'duplicate_task_number'
  | 'validation_without_name'
  | 'done_without_date'
  | 'done_without_proof'
  | 'waiting_without_date'
  | 'waiting_without_addressee'
  | 'journal_heading_without_date'
  | 'journal_without_session'
  | 'session_missing_point'
  | 'journal_out_of_order'
  | 'state_behind_journal'
  | 'journal_behind_state'
  | 'task_not_in_journal'
  | 'decision_without_date'
  | 'no_decision'
  | 'unreadable_frontmatter'

/** An error breaks the format and fails the check command. A warning is content to complete */
export type DossierGapSeverity = 'error' | 'warning'

export interface DossierGap {
  source: 'plan' | 'journal' | 'decisions'
  kind: DossierGapKind
  severity: DossierGapSeverity
  message: string
}

export interface Dossier {
  projectPath: string
  /** null when PLAN.md is absent or unreadable */
  plan: DossierPlan | null
  /** null when JOURNAL.md is absent or unreadable */
  journal: DossierJournalEntry[] | null
  decisions: DossierDecision[]
  gaps: DossierGap[]
}
