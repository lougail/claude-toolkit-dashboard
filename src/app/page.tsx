import {
  FolderOpen,
  GitBranch,
  GitPullRequest,
  Rocket,
  MessageSquare,
  Zap,
  Scale,
  FileText,
  AlertCircle,
  CheckCircle,
  Circle,
  FileDiff,
  CircleDot,
  Loader2,
} from 'lucide-react'
import type { CIStatus } from '@/lib/types'
import { MetricCard } from '@/components/dashboard/metric-card'
import { TokenUsageChart } from '@/components/charts/token-usage-chart'
import { PipelineChart } from '@/components/charts/pipeline-chart'
import { EmptyState } from '@/components/dashboard/empty-state'
import { RefreshIndicator } from '@/components/dashboard/refresh-indicator'
import { RalphTracker } from '@/components/dashboard/ralph-tracker'
import { getDashboardMetrics, discoverProjects } from '@/lib/data/scanner'
import { parseSteering } from '@/lib/parsers/steering'
import { discoverRalphSessions } from '@/lib/parsers/ralph'
import { formatRelativeTime, cn } from '@/lib/utils'

const CI_DISPLAY: Record<CIStatus, { label: string; color: string; icon: 'check' | 'alert' | 'dot' | 'loader' | null }> = {
  passing:    { label: 'CI passing',    color: 'text-emerald-400', icon: 'check' },
  failing:    { label: 'CI failing',    color: 'text-red-400',     icon: 'alert' },
  pending:    { label: 'CI running',    color: 'text-amber-400',   icon: 'loader' },
  configured: { label: 'CI configured', color: 'text-zinc-400',    icon: 'dot' },
  none:       { label: '',              color: '',                  icon: null },
}

function CIBadge({ status }: { status: CIStatus }) {
  const display = CI_DISPLAY[status]
  if (!display.icon) return null

  const Icon = display.icon === 'check' ? CheckCircle
    : display.icon === 'alert' ? AlertCircle
    : display.icon === 'loader' ? Loader2
    : CircleDot

  return (
    <span className={cn('inline-flex items-center gap-1 text-[11px]', display.color)}>
      <Icon className={cn('size-3 shrink-0', display.icon === 'loader' && 'animate-spin')} aria-hidden="true" />
      {display.label}
    </span>
  )
}

export const dynamic = 'force-dynamic'

export default async function OverviewPage() {
  const projects = await discoverProjects()
  const [metrics, ralphSessions] = await Promise.all([
    getDashboardMetrics(projects),
    discoverRalphSessions(projects),
  ])

  // Load steering for the first project (or current project)
  const firstProject = projects[0]
  const steeringDocs = firstProject
    ? await parseSteering(firstProject.path)
    : []

  // Only show projects with recent activity or toolkit config, sorted by last activity
  const activeProjects = projects
    .filter((p) => p.recentSessions.length > 0 || p.health.score > 0)
    .sort((a, b) => (b.lastActivity ?? 0) - (a.lastActivity ?? 0))

  // Count features per v2 status across all projects
  const statusCounts: Record<string, number> = {}
  for (const project of projects) {
    for (const feature of project.features) {
      statusCounts[feature.status] = (statusCounts[feature.status] ?? 0) + 1
    }
  }
  const pipelineData = ['idea', 'prd', 'building', 'review', 'ship', 'done']
    .map((status) => ({ status, count: statusCounts[status] ?? 0 }))
    .filter((d) => d.count > 0)

  return (
    <>
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-zinc-100">Overview</h1>
          <p className="text-sm text-zinc-500 mt-1">
            Claude Code Toolkit activity across all projects
          </p>
        </div>
        <RefreshIndicator />
      </header>

      {/* Metrics grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6 mb-8">
        <MetricCard
          label="Projects"
          value={metrics.totalProjects}
          icon={FolderOpen}
        />
        <MetricCard
          label="Features"
          value={metrics.totalFeatures}
          icon={GitBranch}
        />
        <MetricCard
          label="Active"
          value={metrics.activeFeatures}
          icon={Zap}
          subtitle={
            metrics.totalFeatures > 0
              ? `${Math.round((metrics.activeFeatures / metrics.totalFeatures) * 100)}% of total`
              : undefined
          }
        />
        <MetricCard
          label="Shipped"
          value={metrics.shippedFeatures}
          icon={Rocket}
        />
        <MetricCard
          label="Decisions"
          value={metrics.pendingDecisions}
          subtitle={metrics.pendingDecisions > 0 ? 'pending' : undefined}
          icon={Scale}
          trend={metrics.pendingDecisions > 0 ? 'up' : 'neutral'}
        />
        <MetricCard
          label="Sessions"
          value={metrics.totalSessions}
          icon={MessageSquare}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Token usage chart */}
        <section
          className="rounded-lg border border-white/[0.06] bg-zinc-900/50 p-4"
          aria-label="Token usage over 30 days"
        >
          <h2 className="text-sm font-medium text-zinc-300 mb-4">
            Token Usage (30 days)
          </h2>
          <TokenUsageChart data={metrics.tokenUsage} />
        </section>

        {/* Pipeline chart */}
        <section
          className="rounded-lg border border-white/[0.06] bg-zinc-900/50 p-4"
          aria-label="Feature pipeline distribution"
        >
          <h2 className="text-sm font-medium text-zinc-300 mb-4">
            Feature Pipeline
          </h2>
          <PipelineChart data={pipelineData} />
        </section>
      </div>

      {/* Ralph sessions */}
      {ralphSessions.length > 0 && (
        <div className="mt-6">
          <RalphTracker initialSessions={ralphSessions} />
        </div>
      )}

      {/* Steering docs summary */}
      {steeringDocs.length > 0 && (
        <section className="mt-6 rounded-lg border border-white/[0.06] bg-zinc-900/50 p-4" aria-label="Steering documents">
          <h2 className="text-sm font-medium text-zinc-300 mb-4">
            <FileText className="inline-block h-4 w-4 mr-1.5 -mt-0.5" />
            Steering Docs
            {firstProject && (
              <span className="text-zinc-500 font-normal ml-2">({firstProject.name})</span>
            )}
          </h2>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {steeringDocs.map((doc) => (
              <div
                key={doc.type}
                className={cn(
                  'rounded-md border px-3 py-2',
                  doc.exists
                    ? 'border-white/[0.04] bg-zinc-900/30'
                    : 'border-dashed border-zinc-800 bg-transparent'
                )}
              >
                <div className="flex items-center gap-2">
                  {doc.exists ? (
                    <CheckCircle className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                  ) : (
                    <Circle className="h-3.5 w-3.5 text-zinc-700 shrink-0" />
                  )}
                  <span className="text-xs font-medium text-zinc-300">{doc.type}.md</span>
                </div>
                {doc.exists && (
                  <p className="text-[11px] text-zinc-500 mt-1 truncate">{doc.title}</p>
                )}
                {!doc.exists && (
                  <p className="text-[11px] text-zinc-500 mt-1">Not configured</p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Recent activity */}
      <section className="mt-6 rounded-lg border border-white/[0.06] bg-zinc-900/50 p-4" aria-label="Recent sessions">
        <h2 className="text-sm font-medium text-zinc-300 mb-4">
          Recent Sessions
        </h2>
        {metrics.recentSessions.length === 0 ? (
          <EmptyState
            icon={MessageSquare}
            title="No sessions recorded"
            description="Sessions appear after using Claude Code in any project. Check that ~/.claude/history.jsonl exists."
            className="border-0 bg-transparent py-8"
          />
        ) : (
          <div className="divide-y divide-white/[0.04]">
            {metrics.recentSessions.slice(0, 10).map((session) => {
              const name =
                session.project?.split('/').pop() ?? 'unknown'
              return (
                <div
                  key={session.sessionId}
                  className="flex items-center justify-between py-2.5"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="inline-flex items-center rounded bg-zinc-800 px-1.5 py-0.5 text-[11px] font-medium text-zinc-400 shrink-0">
                      {name}
                    </span>
                    <span className="text-sm text-zinc-300 truncate">
                      {session.display?.slice(0, 80) ?? 'No description'}
                    </span>
                  </div>
                  <span className="text-[11px] text-zinc-500 shrink-0 ml-4">
                    {formatRelativeTime(session.timestamp)}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* Projects list with health — only show active projects */}
      <section className="mt-6 rounded-lg border border-white/[0.06] bg-zinc-900/50 p-4" aria-label="Projects list">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-medium text-zinc-300">Projects</h2>
          {projects.length > 0 && (
            <span className="text-[11px] text-zinc-500">
              {activeProjects.length} actifs / {projects.length} total
            </span>
          )}
        </div>
        {projects.length === 0 ? (
          <EmptyState
            icon={AlertCircle}
            title="No projects detected"
            description="Projects appear when you use Claude Code in a directory. Check that ~/.claude/projects/ exists and contains project folders."
            className="border-0 bg-transparent py-8"
          />
        ) : (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {activeProjects.map((project) => (
              <div
                key={project.encodedPath}
                className="rounded-md border border-white/[0.04] bg-zinc-900/30 px-4 py-3"
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-zinc-200">
                    {project.name}
                  </p>
                  <span
                    className={cn(
                      'inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium',
                      project.health.label === 'healthy'
                        ? 'bg-emerald-500/10 text-emerald-400'
                        : project.health.label === 'partial'
                          ? 'bg-amber-500/10 text-amber-400'
                          : 'bg-zinc-500/10 text-zinc-500'
                    )}
                  >
                    {project.health.score}%
                  </span>
                </div>
                {/* Git branch + dirty indicator */}
                <div className="flex items-center gap-2 mt-1.5">
                  {project.git.branch && (
                    <span className="inline-flex items-center gap-1 text-[11px] text-zinc-400 font-mono">
                      <GitBranch className="size-3 shrink-0" aria-hidden="true" />
                      {project.git.branch}
                    </span>
                  )}
                  {project.git.dirtyCount > 0 && (
                    <span className="inline-flex items-center gap-1 text-[11px] text-amber-400">
                      <FileDiff className="size-3 shrink-0" aria-hidden="true" />
                      {project.git.dirtyCount} dirty
                    </span>
                  )}
                  <CIBadge status={project.git.ciStatus} />
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <p className="text-[11px] text-zinc-600 font-mono truncate">
                    {project.path}
                  </p>
                  {project.lastActivity && (
                    <span className="text-[10px] text-zinc-500 shrink-0">
                      {formatRelativeTime(project.lastActivity)}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-2">
                  <span className="text-[11px] text-zinc-500">
                    {project.features.length} features
                  </span>
                  <span className="text-[11px] text-zinc-500">
                    {project.recentSessions.length} sessions
                  </span>
                  <span className="text-[11px] text-zinc-500">
                    {project.vaultEntries.length} vault
                  </span>
                  {project.git.openPRs > 0 && (
                    <span className="inline-flex items-center gap-1 text-[11px] text-blue-400">
                      <GitPullRequest className="size-3 shrink-0" aria-hidden="true" />
                      {project.git.openPRs} PR{project.git.openPRs > 1 ? 's' : ''}
                    </span>
                  )}
                </div>
                {/* Health details */}
                <div className="flex items-center gap-2 mt-2" role="list" aria-label="Project health checks">
                  {[
                    { label: 'state', ok: project.health.hasState },
                    { label: 'vault', ok: project.health.hasVault },
                    { label: 'steering', ok: project.health.hasSteering },
                    { label: 'tests', ok: project.health.hasTests },
                    { label: 'CI', ok: project.health.hasCI },
                    { label: 'audit', ok: project.health.hasAudit },
                  ].map(({ label, ok }) => (
                    <span
                      key={label}
                      role="listitem"
                      aria-label={`${label}: ${ok ? 'configuré' : 'manquant'}`}
                      className={cn(
                        'text-[10px]',
                        ok ? 'text-emerald-600' : 'text-zinc-700'
                      )}
                    >
                      {ok ? '●' : '○'} {label}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  )
}
