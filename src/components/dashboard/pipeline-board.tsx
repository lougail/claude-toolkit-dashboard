'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { FEATURE_STATUS_CONFIG, FEATURE_STATUSES } from '@/lib/constants'
import { FeatureModal } from '@/components/dashboard/feature-modal'
import type { Feature, FeatureStatus } from '@/lib/types'

interface PipelineBoardProps {
  features: { feature: Feature; projectName: string }[]
  projectNames: string[]
}

function FeatureCard({
  feature,
  projectName,
  onClick,
}: {
  feature: Feature
  projectName: string
  onClick: () => void
}) {
  const progress =
    feature.ralph.storiesTotal > 0
      ? Math.round((feature.ralph.storiesDone / feature.ralph.storiesTotal) * 100)
      : 0

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left rounded-lg border border-white/[0.06] bg-zinc-900/30 p-3 hover:bg-zinc-900/60 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50"
      aria-label={`View details for ${feature.slug}`}
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-sm font-medium text-zinc-200">{feature.slug}</h3>
        {feature.pr !== null && (
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
    </button>
  )
}

export function PipelineBoard({ features, projectNames }: PipelineBoardProps) {
  const [activeProject, setActiveProject] = useState<string | null>(null)
  const [selectedFeature, setSelectedFeature] = useState<{
    feature: Feature
    projectName: string
  } | null>(null)

  const filtered = activeProject
    ? features.filter(({ projectName }) => projectName === activeProject)
    : features

  const featuresByStatus: Record<FeatureStatus, { feature: Feature; projectName: string }[]> = {
    idea: [], prd: [], building: [], review: [], ship: [], done: [],
  }

  for (const item of filtered) {
    if (featuresByStatus[item.feature.status]) {
      featuresByStatus[item.feature.status].push(item)
    }
  }

  return (
    <>
      {/* Project filter */}
      {projectNames.length > 1 && (
        <div className="flex flex-wrap gap-2 mb-6" role="group" aria-label="Filter by project">
          <button
            onClick={() => setActiveProject(null)}
            aria-pressed={activeProject === null}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors',
              activeProject === null
                ? 'bg-white/10 text-zinc-100 ring-1 ring-white/20'
                : 'bg-zinc-800/50 text-zinc-400 hover:bg-zinc-800'
            )}
          >
            All
            <span className="text-[10px] opacity-60">{features.length}</span>
          </button>
          {projectNames.map((name) => {
            const isActive = activeProject === name
            const count = features.filter(({ projectName }) => projectName === name).length
            return (
              <button
                key={name}
                onClick={() => setActiveProject(isActive ? null : name)}
                aria-pressed={isActive}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors',
                  isActive
                    ? 'bg-white/10 text-zinc-100 ring-1 ring-white/20'
                    : 'bg-zinc-800/50 text-zinc-400 hover:bg-zinc-800'
                )}
              >
                {name}
                <span className="text-[10px] opacity-60">{count}</span>
              </button>
            )
          })}
        </div>
      )}

      {/* Kanban grid */}
      <div className="overflow-x-auto -mx-4 px-4 pb-4">
        <div className="grid grid-cols-6 gap-3 min-w-[900px]" aria-label="Feature pipeline board">
        {FEATURE_STATUSES.map((status) => {
            const items = featuresByStatus[status]
            const config = FEATURE_STATUS_CONFIG[status]
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
                  <span className="text-[11px] text-zinc-500">
                    {items.length}
                  </span>
                </div>
                <div className="space-y-2">
                  {items.map(({ feature, projectName }) => (
                    <FeatureCard
                      key={`${projectName}-${feature.slug}`}
                      feature={feature}
                      projectName={projectName}
                      onClick={() => setSelectedFeature({ feature, projectName })}
                    />
                  ))}
                </div>
              </div>
            )
          }
        )}
        </div>
      </div>

      {/* Feature detail modal */}
      <FeatureModal
        feature={selectedFeature?.feature ?? null}
        projectName={selectedFeature?.projectName ?? null}
        onClose={() => setSelectedFeature(null)}
      />
    </>
  )
}
