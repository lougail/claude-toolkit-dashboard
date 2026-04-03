import { GitBranch, Lightbulb, FileText, Hammer, Search, Rocket, CheckCircle2 } from 'lucide-react'
import { discoverProjects } from '@/lib/data/scanner'
import { EmptyState } from '@/components/dashboard/empty-state'
import type { Feature, FeatureStatus } from '@/lib/types'
import { cn } from '@/lib/utils'
import type { LucideIcon } from 'lucide-react'

export const dynamic = 'force-dynamic'

const PIPELINE_COLUMNS: {
  status: FeatureStatus
  label: string
  icon: LucideIcon
  color: string
}[] = [
  { status: 'idea', label: 'Idea', icon: Lightbulb, color: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30' },
  { status: 'prd', label: 'PRD', icon: FileText, color: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
  { status: 'building', label: 'Building', icon: Hammer, color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  { status: 'review', label: 'Review', icon: Search, color: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
  { status: 'ship', label: 'Ship', icon: Rocket, color: 'bg-orange-500/20 text-orange-400 border-orange-500/30' },
  { status: 'done', label: 'Done', icon: CheckCircle2, color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
]

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
        <p className="mt-1.5 text-[11px] text-zinc-500 font-mono truncate">
          {feature.prd}
        </p>
      )}
    </div>
  )
}

export default async function PipelinePage() {
  const projects = await discoverProjects()

  const featuresByStatus: Record<FeatureStatus, { feature: Feature; projectName: string }[]> = {
    idea: [],
    prd: [],
    building: [],
    review: [],
    ship: [],
    done: [],
  }

  for (const project of projects) {
    for (const feature of project.features) {
      if (featuresByStatus[feature.status]) {
        featuresByStatus[feature.status].push({ feature, projectName: project.name })
      }
    }
  }

  const hasFeatures = Object.values(featuresByStatus).some((f) => f.length > 0)

  return (
    <>
      <header className="mb-8">
        <h1 className="text-lg font-semibold text-zinc-100">
          Feature Timeline
        </h1>
        <p className="text-sm text-zinc-500 mt-1">
          Track features from idea to done across all projects
        </p>
      </header>

      {!hasFeatures ? (
        <EmptyState
          icon={GitBranch}
          title="No features tracked"
          description="Features appear when projects have a .claude/state.json with tracked features. Create a PRD and start implementation to see features here."
          action="/prd to create a feature spec"
        />
      ) : (
        <div className="overflow-x-auto -mx-4 px-4 pb-4">
          <div className="grid grid-cols-6 gap-3 min-w-[900px]">
            {PIPELINE_COLUMNS.map(({ status, label, icon: Icon, color }) => {
              const features = featuresByStatus[status]
              return (
                <div key={status} className="min-w-[140px]">
                  <div className="flex items-center gap-1.5 mb-3">
                    <Icon className="size-3.5 text-zinc-500" aria-hidden="true" />
                    <span
                      className={cn(
                        'inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-medium',
                        color
                      )}
                    >
                      {label}
                    </span>
                    <span className="text-[11px] text-zinc-500">
                      {features.length}
                    </span>
                  </div>
                  <div className="space-y-2" role="list" aria-label={`${label} features`}>
                    {features.map(({ feature, projectName }) => (
                      <FeatureCard
                        key={`${projectName}-${feature.slug}`}
                        feature={feature}
                        projectName={projectName}
                      />
                    ))}
                    {features.length === 0 && (
                      <div className="rounded-lg border border-dashed border-white/[0.04] p-4 text-center">
                        <p className="text-[11px] text-zinc-600">No features</p>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </>
  )
}
