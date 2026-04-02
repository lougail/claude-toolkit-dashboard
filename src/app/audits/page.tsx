import { ShieldCheck } from 'lucide-react'
import { discoverProjects } from '@/lib/data/scanner'
import { EmptyState } from '@/components/dashboard/empty-state'
import { cn } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export default async function AuditsPage() {
  const projects = await discoverProjects()

  const audits = projects.flatMap((project) =>
    project.features
      .filter((f) => f.audit.lastDate)
      .map((f) => ({
        feature: f.slug,
        project: project.name,
        score: f.audit.score,
        blockers: f.audit.blockers,
        date: f.audit.lastDate!,
      }))
  ).sort((a, b) => b.date.localeCompare(a.date))

  return (
    <>
      <header className="mb-8">
        <h1 className="text-lg font-semibold text-zinc-100">Audit Scores</h1>
        <p className="text-sm text-zinc-500 mt-1">
          PRD compliance audits across all features
        </p>
      </header>

      {audits.length === 0 ? (
        <EmptyState
          icon={ShieldCheck}
          title="No audit data"
          description="Audit scores appear when features have been audited. Run an audit on a feature with an active PRD to see scores and blockers here."
          action="/audit-prd to audit a feature"
        />
      ) : (
        <div className="space-y-3">
          {audits.map((audit) => (
            <div
              key={`${audit.project}-${audit.feature}`}
              className="flex items-center gap-4 rounded-lg border border-white/[0.06] bg-zinc-900/50 px-4 py-3"
            >
              {/* Score badge */}
              <div
                className={cn(
                  'flex h-10 w-10 items-center justify-center rounded-lg text-sm font-semibold shrink-0',
                  audit.score !== null && audit.score >= 80
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : audit.score !== null && audit.score >= 50
                      ? 'bg-amber-500/20 text-amber-400'
                      : 'bg-red-500/20 text-red-400'
                )}
              >
                {audit.score ?? '?'}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-zinc-200">
                  {audit.feature}
                </p>
                <p className="text-[11px] text-zinc-500">{audit.project}</p>
              </div>

              {/* Blockers */}
              {audit.blockers > 0 && (
                <span className="inline-flex items-center rounded bg-red-500/10 px-2 py-0.5 text-[11px] font-medium text-red-400 shrink-0">
                  {audit.blockers} blocker{audit.blockers > 1 ? 's' : ''}
                </span>
              )}

              {/* Date */}
              <span className="text-[11px] text-zinc-600 shrink-0">
                {audit.date}
              </span>
            </div>
          ))}
        </div>
      )}
    </>
  )
}
