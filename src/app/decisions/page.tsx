import { Scale, Lightbulb, Sparkles, BookOpen, Newspaper } from 'lucide-react'
import { discoverProjects } from '@/lib/data/scanner'
import type { VaultEntry } from '@/lib/types'
import { cn } from '@/lib/utils'

export const dynamic = 'force-dynamic'

const TYPE_CONFIG: Record<
  string,
  { icon: typeof Scale; color: string; label: string }
> = {
  decision: {
    icon: Scale,
    color: 'text-blue-400 bg-blue-500/10',
    label: 'Decision',
  },
  idea: {
    icon: Lightbulb,
    color: 'text-amber-400 bg-amber-500/10',
    label: 'Idea',
  },
  insight: {
    icon: Sparkles,
    color: 'text-purple-400 bg-purple-500/10',
    label: 'Insight',
  },
  research: {
    icon: BookOpen,
    color: 'text-emerald-400 bg-emerald-500/10',
    label: 'Research',
  },
  journal: {
    icon: Newspaper,
    color: 'text-zinc-400 bg-zinc-500/10',
    label: 'Journal',
  },
}

function VaultCard({
  entry,
  projectName,
}: {
  entry: VaultEntry
  projectName: string
}) {
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
        >
          <Icon className="h-3.5 w-3.5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-medium text-zinc-200 truncate">
              {entry.title}
            </h3>
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

export default async function DecisionsPage() {
  const projects = await discoverProjects()

  const allEntries = projects.flatMap((project) =>
    project.vaultEntries.map((entry) => ({
      entry,
      projectName: project.name,
    }))
  )

  // Sort by date, most recent first
  allEntries.sort((a, b) => b.entry.date.localeCompare(a.entry.date))

  // Group counts by type
  const typeCounts = allEntries.reduce(
    (acc, { entry }) => {
      acc[entry.type] = (acc[entry.type] ?? 0) + 1
      return acc
    },
    {} as Record<string, number>
  )

  return (
    <>
      <header className="mb-8">
        <h1 className="text-lg font-semibold text-zinc-100">
          Decisions & Vault
        </h1>
        <p className="text-sm text-zinc-500 mt-1">
          Decisions, ideas, insights and research from all projects
        </p>
      </header>

      {/* Type filter badges */}
      {Object.keys(typeCounts).length > 0 && (
        <div className="flex flex-wrap gap-2 mb-6">
          {Object.entries(typeCounts).map(([type, count]) => {
            const config = TYPE_CONFIG[type]
            return (
              <span
                key={type}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] font-medium',
                  config?.color ?? 'bg-zinc-500/10 text-zinc-400'
                )}
              >
                {config?.label ?? type}
                <span className="text-[10px] opacity-60">{count}</span>
              </span>
            )
          })}
        </div>
      )}

      {allEntries.length === 0 ? (
        <div className="rounded-lg border border-white/[0.06] bg-zinc-900/50 py-16 text-center">
          <p className="text-sm text-zinc-500">No vault entries found.</p>
          <p className="text-xs text-zinc-600 mt-1">
            Vault entries appear in{' '}
            <code className="text-zinc-400">vault/</code> directories within
            your projects.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {allEntries.map(({ entry, projectName }) => (
            <VaultCard
              key={entry.path}
              entry={entry}
              projectName={projectName}
            />
          ))}
        </div>
      )}
    </>
  )
}
