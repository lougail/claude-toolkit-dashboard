'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import type { VaultEntry } from '@/lib/types'
import {
  Scale,
  Lightbulb,
  Sparkles,
  BookOpen,
  Newspaper,
  type LucideIcon,
} from 'lucide-react'

const TYPE_CONFIG: Record<string, { icon: LucideIcon; color: string; label: string }> = {
  decision: { icon: Scale, color: 'text-blue-400 bg-blue-500/10', label: 'Decision' },
  idea: { icon: Lightbulb, color: 'text-amber-400 bg-amber-500/10', label: 'Idea' },
  insight: { icon: Sparkles, color: 'text-purple-400 bg-purple-500/10', label: 'Insight' },
  research: { icon: BookOpen, color: 'text-emerald-400 bg-emerald-500/10', label: 'Research' },
  journal: { icon: Newspaper, color: 'text-zinc-400 bg-zinc-500/10', label: 'Journal' },
}

interface DecisionFilterProps {
  entries: { entry: VaultEntry; projectName: string }[]
}

function VaultCard({ entry, projectName }: { entry: VaultEntry; projectName: string }) {
  const config = TYPE_CONFIG[entry.type] ?? TYPE_CONFIG.journal!
  const Icon = config.icon

  return (
    <div className="rounded-lg border border-white/[0.06] bg-zinc-900/50 px-4 py-3">
      <div className="flex items-start gap-3">
        <div
          className={cn(
            'mt-0.5 flex h-7 w-7 items-center justify-center rounded-md shrink-0',
            config.color
          )}
          aria-hidden="true"
        >
          <Icon className="h-3.5 w-3.5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-medium text-zinc-200 truncate">{entry.title}</h3>
            {entry.status && (
              <span
                className={cn(
                  'inline-flex rounded px-1.5 py-0.5 text-[10px] font-medium',
                  entry.status === 'validee' || entry.status === 'validated'
                    ? 'bg-emerald-500/10 text-emerald-400'
                    : entry.status === 'rejetee' || entry.status === 'rejected'
                      ? 'bg-red-500/10 text-red-400'
                      : 'bg-zinc-500/10 text-zinc-400'
                )}
              >
                {entry.status}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[11px] text-zinc-500">{projectName}</span>
            {entry.date && (
              <>
                <span className="text-zinc-700">·</span>
                <span className="text-[11px] text-zinc-600">{entry.date}</span>
              </>
            )}
          </div>
          {entry.content && (
            <p className="mt-2 text-xs text-zinc-400 line-clamp-3 leading-relaxed">
              {entry.content.slice(0, 300)}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

export function DecisionFilter({ entries }: DecisionFilterProps) {
  const [activeFilter, setActiveFilter] = useState<string | null>(null)

  const typeCounts = entries.reduce(
    (acc, { entry }) => {
      acc[entry.type] = (acc[entry.type] ?? 0) + 1
      return acc
    },
    {} as Record<string, number>
  )

  const filtered = activeFilter
    ? entries.filter(({ entry }) => entry.type === activeFilter)
    : entries

  return (
    <>
      {Object.keys(typeCounts).length > 0 && (
        <div className="flex flex-wrap gap-2 mb-6" role="group" aria-label="Filter by type">
          <button
            onClick={() => setActiveFilter(null)}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors',
              activeFilter === null
                ? 'bg-white/10 text-zinc-100 ring-1 ring-white/20'
                : 'bg-zinc-800/50 text-zinc-400 hover:bg-zinc-800'
            )}
          >
            All
            <span className="text-[10px] opacity-60">{entries.length}</span>
          </button>
          {Object.entries(typeCounts).map(([type, count]) => {
            const config = TYPE_CONFIG[type]
            const isActive = activeFilter === type
            return (
              <button
                key={type}
                onClick={() => setActiveFilter(isActive ? null : type)}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors',
                  isActive
                    ? cn(config?.color ?? 'bg-zinc-500/10 text-zinc-400', 'ring-1 ring-white/20')
                    : cn(config?.color ?? 'bg-zinc-500/10 text-zinc-400', 'opacity-60 hover:opacity-100')
                )}
              >
                {config?.label ?? type}
                <span className="text-[10px] opacity-60">{count}</span>
              </button>
            )
          })}
        </div>
      )}

      <div className="space-y-2">
        {filtered.map(({ entry, projectName }) => (
          <VaultCard key={entry.path} entry={entry} projectName={projectName} />
        ))}
      </div>
    </>
  )
}
