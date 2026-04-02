import {
  FolderOpen,
  GitBranch,
  Rocket,
  MessageSquare,
  Zap,
  Scale,
} from 'lucide-react'
import { MetricCard } from '@/components/dashboard/metric-card'
import { TokenUsageChart } from '@/components/charts/token-usage-chart'
import { PipelineChart } from '@/components/charts/pipeline-chart'
import { getDashboardMetrics, discoverProjects } from '@/lib/data/scanner'
import { formatRelativeTime } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export default async function OverviewPage() {
  const [metrics, projects] = await Promise.all([
    getDashboardMetrics(),
    discoverProjects(),
  ])

  const pipelineData = [
    {
      status: 'planning',
      count: metrics.totalFeatures - metrics.activeFeatures - metrics.shippedFeatures,
    },
    { status: 'in-progress', count: metrics.activeFeatures },
    { status: 'shipped', count: metrics.shippedFeatures },
  ].filter((d) => d.count > 0)

  return (
    <>
      <header className="mb-8">
        <h1 className="text-lg font-semibold text-zinc-100">Overview</h1>
        <p className="text-sm text-zinc-500 mt-1">
          Claude Code Toolkit activity across all projects
        </p>
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
        <section className="rounded-lg border border-white/[0.06] bg-zinc-900/50 p-4">
          <h2 className="text-sm font-medium text-zinc-300 mb-4">
            Token Usage (30 days)
          </h2>
          <TokenUsageChart data={metrics.tokenUsage} />
        </section>

        {/* Pipeline chart */}
        <section className="rounded-lg border border-white/[0.06] bg-zinc-900/50 p-4">
          <h2 className="text-sm font-medium text-zinc-300 mb-4">
            Feature Pipeline
          </h2>
          <PipelineChart data={pipelineData} />
        </section>
      </div>

      {/* Recent activity */}
      <section className="mt-6 rounded-lg border border-white/[0.06] bg-zinc-900/50 p-4">
        <h2 className="text-sm font-medium text-zinc-300 mb-4">
          Recent Sessions
        </h2>
        {metrics.recentSessions.length === 0 ? (
          <p className="text-sm text-zinc-500 py-8 text-center">
            No sessions recorded yet
          </p>
        ) : (
          <div className="divide-y divide-white/[0.04]">
            {metrics.recentSessions.slice(0, 10).map((session) => {
              const projectName =
                session.project?.split('/').pop() ?? 'unknown'
              return (
                <div
                  key={session.sessionId}
                  className="flex items-center justify-between py-2.5"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="inline-flex items-center rounded bg-zinc-800 px-1.5 py-0.5 text-[11px] font-medium text-zinc-400 shrink-0">
                      {projectName}
                    </span>
                    <span className="text-sm text-zinc-300 truncate">
                      {session.display?.slice(0, 80) ?? 'No description'}
                    </span>
                  </div>
                  <span className="text-[11px] text-zinc-600 shrink-0 ml-4">
                    {formatRelativeTime(session.timestamp)}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* Projects list */}
      <section className="mt-6 rounded-lg border border-white/[0.06] bg-zinc-900/50 p-4">
        <h2 className="text-sm font-medium text-zinc-300 mb-4">Projects</h2>
        {projects.length === 0 ? (
          <p className="text-sm text-zinc-500 py-8 text-center">
            No projects found in ~/.claude/projects/
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {projects.map((project) => (
              <div
                key={project.encodedPath}
                className="rounded-md border border-white/[0.04] bg-zinc-900/30 px-4 py-3"
              >
                <p className="text-sm font-medium text-zinc-200">
                  {project.name}
                </p>
                <p className="text-[11px] text-zinc-600 mt-0.5 font-mono truncate">
                  {project.path}
                </p>
                <div className="flex items-center gap-3 mt-2">
                  <span className="text-[11px] text-zinc-500">
                    {project.features.length} features
                  </span>
                  <span className="text-[11px] text-zinc-500">
                    {project.recentSessions.length} sessions
                  </span>
                  <span className="text-[11px] text-zinc-500">
                    {project.vaultEntries.length} vault entries
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  )
}
