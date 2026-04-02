import { discoverProjects } from '@/lib/data/scanner'
import type { Feature } from '@/lib/types'
import { cn } from '@/lib/utils'

export const dynamic = 'force-dynamic'

const STATUS_CONFIG = {
  planning: { label: 'Planning', color: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
  'in-progress': { label: 'In Progress', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  shipped: { label: 'Shipped', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
} as const

function FeatureCard({ feature, projectName }: { feature: Feature; projectName: string }) {
  const progress =
    feature.ralph.storiesTotal > 0
      ? Math.round((feature.ralph.storiesDone / feature.ralph.storiesTotal) * 100)
      : 0

  return (
    <div className="rounded-lg border border-white/[0.06] bg-zinc-900/30 p-3">
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-sm font-medium text-zinc-200">{feature.slug}</h3>
        {feature.pr && (
          <span className="text-[11px] text-zinc-500 shrink-0">
            PR #{feature.pr}
          </span>
        )}
      </div>

      <p className="text-[11px] text-zinc-500 mt-0.5">{projectName}</p>

      {feature.ralph.active && (
        <div className="mt-2">
          <div className="flex items-center justify-between text-[11px] text-zinc-500 mb-1">
            <span>Ralph progress</span>
            <span>
              {feature.ralph.storiesDone}/{feature.ralph.storiesTotal}
            </span>
          </div>
          <div className="h-1 rounded-full bg-zinc-800 overflow-hidden">
            <div
              className="h-full rounded-full bg-blue-500 transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {feature.audit.score !== null && (
        <div className="mt-2 flex items-center gap-2">
          <span className="text-[11px] text-zinc-500">Audit:</span>
          <span
            className={cn(
              'text-[11px] font-medium',
              feature.audit.score >= 80
                ? 'text-emerald-400'
                : feature.audit.score >= 50
                  ? 'text-amber-400'
                  : 'text-red-400'
            )}
          >
            {feature.audit.score}%
          </span>
          {feature.audit.blockers > 0 && (
            <span className="text-[11px] text-red-400">
              {feature.audit.blockers} blockers
            </span>
          )}
        </div>
      )}

      {feature.prd && (
        <p className="mt-1.5 text-[11px] text-zinc-600 font-mono truncate">
          {feature.prd}
        </p>
      )}
    </div>
  )
}

export default async function PipelinePage() {
  const projects = await discoverProjects()

  const featuresByStatus = {
    planning: [] as { feature: Feature; projectName: string }[],
    'in-progress': [] as { feature: Feature; projectName: string }[],
    shipped: [] as { feature: Feature; projectName: string }[],
  }

  for (const project of projects) {
    for (const feature of project.features) {
      const status = feature.status as keyof typeof featuresByStatus
      if (featuresByStatus[status]) {
        featuresByStatus[status].push({ feature, projectName: project.name })
      }
    }
  }

  const hasFeatures = Object.values(featuresByStatus).some((f) => f.length > 0)

  return (
    <>
      <header className="mb-8">
        <h1 className="text-lg font-semibold text-zinc-100">
          Feature Pipeline
        </h1>
        <p className="text-sm text-zinc-500 mt-1">
          Track features from planning to shipped across all projects
        </p>
      </header>

      {!hasFeatures ? (
        <div className="rounded-lg border border-white/[0.06] bg-zinc-900/50 py-16 text-center">
          <p className="text-sm text-zinc-500">
            No features tracked yet.
          </p>
          <p className="text-xs text-zinc-600 mt-1">
            Features appear when projects have a .claude/state.json with tracked features.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {(Object.entries(featuresByStatus) as [keyof typeof STATUS_CONFIG, typeof featuresByStatus.planning][]).map(
            ([status, features]) => {
              const config = STATUS_CONFIG[status]
              return (
                <div key={status}>
                  <div className="flex items-center gap-2 mb-3">
                    <span
                      className={cn(
                        'inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-medium',
                        config.color
                      )}
                    >
                      {config.label}
                    </span>
                    <span className="text-[11px] text-zinc-600">
                      {features.length}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {features.map(({ feature, projectName }) => (
                      <FeatureCard
                        key={`${projectName}-${feature.slug}`}
                        feature={feature}
                        projectName={projectName}
                      />
                    ))}
                  </div>
                </div>
              )
            }
          )}
        </div>
      )}
    </>
  )
}
