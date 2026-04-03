import {
  ArrowLeft,
  CheckCircle,
  Circle,
  FileText,
  Folder,
  GitBranch,
  Lightbulb,
  MessageSquare,
  Shield,
  TestTube,
  BookOpen,
  Clock,
} from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { discoverProjects } from '@/lib/data/scanner'
import { parseSteering } from '@/lib/parsers/steering'
import { cn, formatRelativeTime } from '@/lib/utils'
import { FEATURE_STATUS_CONFIG } from '@/lib/constants'

export const dynamic = 'force-dynamic'

const DEFAULT_STATUS = { label: 'Unknown', color: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30' }

const VAULT_TYPE_CONFIG: Record<string, { label: string; color: string }> = {
  idea: { label: 'Idea', color: 'bg-purple-500/20 text-purple-400' },
  decision: { label: 'Decision', color: 'bg-blue-500/20 text-blue-400' },
  insight: { label: 'Insight', color: 'bg-amber-500/20 text-amber-400' },
  research: { label: 'Research', color: 'bg-cyan-500/20 text-cyan-400' },
  journal: { label: 'Journal', color: 'bg-emerald-500/20 text-emerald-400' },
  unknown: { label: 'Other', color: 'bg-zinc-500/20 text-zinc-400' },
}

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const projects = await discoverProjects()
  const project = projects.find((p) => p.encodedPath === id)

  if (!project) {
    notFound()
  }

  const steeringDocs = await parseSteering(project.path)

  const healthChecks = [
    { key: 'state', label: 'State', ok: project.health.hasState, icon: Folder },
    { key: 'vault', label: 'Vault', ok: project.health.hasVault, icon: BookOpen },
    { key: 'steering', label: 'Steering', ok: project.health.hasSteering, icon: FileText },
    { key: 'tests', label: 'Tests', ok: project.health.hasTests, icon: TestTube },
  ]

  return (
    <>
      {/* Back link */}
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-300 transition-colors mb-6"
        aria-label="Back to overview"
      >
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
        Overview
      </Link>

      {/* Header */}
      <header className="mb-8">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-semibold text-zinc-100">
            {project.name}
          </h1>
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
            {project.health.score}% {project.health.label}
          </span>
        </div>
        <p className="text-[11px] text-zinc-500 mt-1 font-mono">
          {project.path}
        </p>
      </header>

      {/* Health grid */}
      <section
        className="mb-6"
        aria-label="Project health checks"
      >
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {healthChecks.map(({ key, label, ok, icon: Icon }) => (
            <div
              key={key}
              className="rounded-lg border border-white/[0.06] bg-zinc-900/50 p-4"
            >
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-medium uppercase tracking-wider text-zinc-500">
                  {label}
                </p>
                <Icon className="h-4 w-4 text-zinc-500" aria-hidden="true" />
              </div>
              <div className="mt-2 flex items-center gap-2">
                {ok ? (
                  <CheckCircle className="h-4 w-4 text-emerald-500" aria-hidden="true" />
                ) : (
                  <Circle className="h-4 w-4 text-zinc-700" aria-hidden="true" />
                )}
                <span
                  className={cn(
                    'text-sm font-medium',
                    ok ? 'text-emerald-400' : 'text-zinc-500'
                  )}
                >
                  {ok ? 'Configured' : 'Missing'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section
        className="mb-6 rounded-lg border border-white/[0.06] bg-zinc-900/50 p-4"
        aria-label="Project features"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-medium text-zinc-300">
            <GitBranch className="inline-block h-4 w-4 mr-1.5 -mt-0.5" aria-hidden="true" />
            Features
          </h2>
          <span className="text-[11px] text-zinc-500">
            {project.features.length} total
          </span>
        </div>
        {project.features.length === 0 ? (
          <p className="text-sm text-zinc-500 py-4 text-center">
            No features tracked
          </p>
        ) : (
          <div className="divide-y divide-white/[0.04]">
            {project.features.map((feature) => {
              const statusConf = FEATURE_STATUS_CONFIG[feature.status] ?? DEFAULT_STATUS
              const progress =
                feature.ralph.storiesTotal > 0
                  ? Math.round(
                      (feature.ralph.storiesDone / feature.ralph.storiesTotal) * 100
                    )
                  : null

              return (
                <div
                  key={feature.slug}
                  className="flex items-center justify-between gap-4 py-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className={cn(
                        'inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-medium shrink-0',
                        statusConf.color
                      )}
                    >
                      {statusConf.label}
                    </span>
                    <span className="text-sm font-medium text-zinc-200 truncate">
                      {feature.slug}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 shrink-0">
                    {feature.audit.score !== null && (
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
                        <Shield className="inline-block h-3 w-3 mr-0.5 -mt-0.5" aria-hidden="true" />
                        {feature.audit.score}%
                      </span>
                    )}
                    {progress !== null && (
                      <span className="text-[11px] text-zinc-500">
                        Ralph {feature.ralph.storiesDone}/{feature.ralph.storiesTotal}
                      </span>
                    )}
                    {feature.pr && (
                      <span className="text-[11px] text-zinc-500">
                        PR #{feature.pr}
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* Steering docs */}
      {steeringDocs.length > 0 && (
        <section
          className="mb-6 rounded-lg border border-white/[0.06] bg-zinc-900/50 p-4"
          aria-label="Steering documents"
        >
          <h2 className="text-sm font-medium text-zinc-300 mb-4">
            <FileText className="inline-block h-4 w-4 mr-1.5 -mt-0.5" aria-hidden="true" />
            Steering Docs
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
                    <CheckCircle className="h-3.5 w-3.5 text-emerald-500 shrink-0" aria-hidden="true" />
                  ) : (
                    <Circle className="h-3.5 w-3.5 text-zinc-700 shrink-0" aria-hidden="true" />
                  )}
                  <span className="text-xs font-medium text-zinc-300">
                    {doc.type}.md
                  </span>
                </div>
                {doc.exists && (
                  <p className="text-[11px] text-zinc-500 mt-1 truncate">
                    {doc.title}
                  </p>
                )}
                {!doc.exists && (
                  <p className="text-[11px] text-zinc-500 mt-1">Not configured</p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Recent sessions */}
      <section
        className="mb-6 rounded-lg border border-white/[0.06] bg-zinc-900/50 p-4"
        aria-label="Recent sessions"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-medium text-zinc-300">
            <MessageSquare className="inline-block h-4 w-4 mr-1.5 -mt-0.5" aria-hidden="true" />
            Recent Sessions
          </h2>
          <span className="text-[11px] text-zinc-500">
            {project.recentSessions.length} total
          </span>
        </div>
        {project.recentSessions.length === 0 ? (
          <p className="text-sm text-zinc-500 py-4 text-center">
            No sessions recorded
          </p>
        ) : (
          <div className="divide-y divide-white/[0.04]">
            {project.recentSessions.slice(0, 15).map((session, i) => (
              <div
                key={`${session.sessionId}-${i}`}
                className="flex items-center justify-between py-2.5"
              >
                <span className="text-sm text-zinc-300 truncate mr-4">
                  {session.display?.slice(0, 100) ?? 'No description'}
                </span>
                <span className="text-[11px] text-zinc-500 shrink-0">
                  <Clock className="inline-block h-3 w-3 mr-0.5 -mt-0.5" aria-hidden="true" />
                  {formatRelativeTime(session.timestamp)}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Vault entries */}
      <section
        className="rounded-lg border border-white/[0.06] bg-zinc-900/50 p-4"
        aria-label="Vault entries"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-medium text-zinc-300">
            <Lightbulb className="inline-block h-4 w-4 mr-1.5 -mt-0.5" aria-hidden="true" />
            Vault
          </h2>
          <span className="text-[11px] text-zinc-500">
            {project.vaultEntries.length} entries
          </span>
        </div>
        {project.vaultEntries.length === 0 ? (
          <p className="text-sm text-zinc-500 py-4 text-center">
            No vault entries
          </p>
        ) : (
          <div className="divide-y divide-white/[0.04]">
            {project.vaultEntries.map((entry) => {
              const typeConf = VAULT_TYPE_CONFIG[entry.type] ?? VAULT_TYPE_CONFIG.unknown
              return (
                <div
                  key={entry.path}
                  className="flex items-center justify-between py-2.5"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className={cn(
                        'inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium shrink-0',
                        typeConf.color
                      )}
                    >
                      {typeConf.label}
                    </span>
                    <span className="text-sm text-zinc-300 truncate">
                      {entry.title}
                    </span>
                  </div>
                  <span className="text-[11px] text-zinc-500 shrink-0 ml-4 font-mono">
                    {entry.date}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </section>
    </>
  )
}
