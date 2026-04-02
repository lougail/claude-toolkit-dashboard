import { TokenUsageChart } from '@/components/charts/token-usage-chart'
import {
  collectAgentMessages,
  discoverProjects,
} from '@/lib/data/scanner'
import { parseHistory } from '@/lib/parsers/jsonl'
import { aggregateTokenUsage } from '@/lib/parsers/jsonl'
import { HISTORY_FILE } from '@/lib/config'
import { formatRelativeTime, formatTokenCount } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export default async function ActivityPage() {
  const [sessions, agentMessages, projects] = await Promise.all([
    parseHistory(HISTORY_FILE),
    collectAgentMessages(30),
    discoverProjects(),
  ])

  const tokenUsage = aggregateTokenUsage(agentMessages)

  // Aggregate stats
  const totalInput = tokenUsage.reduce((sum, d) => sum + d.input, 0)
  const totalOutput = tokenUsage.reduce((sum, d) => sum + d.output, 0)

  // Sessions per project
  const sessionsByProject = new Map<string, number>()
  for (const session of sessions) {
    const name = session.project?.split('/').pop() ?? 'unknown'
    sessionsByProject.set(name, (sessionsByProject.get(name) ?? 0) + 1)
  }
  const projectSessionList = Array.from(sessionsByProject.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)

  // Sessions per day (last 14 days)
  const now = Date.now()
  const fourteenDays = 14 * 24 * 60 * 60 * 1000
  const recentSessions = sessions.filter((s) => now - s.timestamp < fourteenDays)
  const sessionsByDay = new Map<string, number>()
  for (const session of recentSessions) {
    const day = new Date(session.timestamp).toISOString().slice(0, 10)
    sessionsByDay.set(day, (sessionsByDay.get(day) ?? 0) + 1)
  }

  return (
    <>
      <header className="mb-8">
        <h1 className="text-lg font-semibold text-zinc-100">Activity</h1>
        <p className="text-sm text-zinc-500 mt-1">
          Session and token usage metrics
        </p>
      </header>

      {/* Summary stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 mb-8">
        <div className="rounded-lg border border-white/[0.06] bg-zinc-900/50 p-4">
          <p className="text-[11px] uppercase tracking-wider text-zinc-500">
            Total Sessions
          </p>
          <p className="mt-1 text-2xl font-semibold text-zinc-100">
            {sessions.length}
          </p>
        </div>
        <div className="rounded-lg border border-white/[0.06] bg-zinc-900/50 p-4">
          <p className="text-[11px] uppercase tracking-wider text-zinc-500">
            Last 14 days
          </p>
          <p className="mt-1 text-2xl font-semibold text-zinc-100">
            {recentSessions.length}
          </p>
        </div>
        <div className="rounded-lg border border-white/[0.06] bg-zinc-900/50 p-4">
          <p className="text-[11px] uppercase tracking-wider text-zinc-500">
            Input Tokens (30d)
          </p>
          <p className="mt-1 text-2xl font-semibold text-blue-400">
            {formatTokenCount(totalInput)}
          </p>
        </div>
        <div className="rounded-lg border border-white/[0.06] bg-zinc-900/50 p-4">
          <p className="text-[11px] uppercase tracking-wider text-zinc-500">
            Output Tokens (30d)
          </p>
          <p className="mt-1 text-2xl font-semibold text-purple-400">
            {formatTokenCount(totalOutput)}
          </p>
        </div>
      </div>

      {/* Token usage chart */}
      <section className="rounded-lg border border-white/[0.06] bg-zinc-900/50 p-4 mb-6">
        <h2 className="text-sm font-medium text-zinc-300 mb-4">
          Token Usage Over Time
        </h2>
        <TokenUsageChart data={tokenUsage} />
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Sessions per project */}
        <section className="rounded-lg border border-white/[0.06] bg-zinc-900/50 p-4">
          <h2 className="text-sm font-medium text-zinc-300 mb-4">
            Sessions by Project
          </h2>
          {projectSessionList.length === 0 ? (
            <p className="text-sm text-zinc-500 py-4 text-center">
              No session data
            </p>
          ) : (
            <div className="space-y-2">
              {projectSessionList.map(([name, count]) => {
                const maxCount = projectSessionList[0]?.[1] ?? 1
                const pct = Math.round((count / maxCount) * 100)
                return (
                  <div key={name}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-zinc-300">{name}</span>
                      <span className="text-[11px] text-zinc-500">
                        {count}
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-blue-500/60"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>

        {/* Daily sessions (last 14 days) */}
        <section className="rounded-lg border border-white/[0.06] bg-zinc-900/50 p-4">
          <h2 className="text-sm font-medium text-zinc-300 mb-4">
            Daily Sessions (14 days)
          </h2>
          {sessionsByDay.size === 0 ? (
            <p className="text-sm text-zinc-500 py-4 text-center">
              No recent sessions
            </p>
          ) : (
            <div className="space-y-1.5">
              {Array.from(sessionsByDay.entries())
                .sort((a, b) => b[0].localeCompare(a[0]))
                .map(([day, count]) => {
                  const maxCount = Math.max(
                    ...Array.from(sessionsByDay.values())
                  )
                  const pct = Math.round((count / maxCount) * 100)
                  return (
                    <div key={day} className="flex items-center gap-3">
                      <span className="text-[11px] text-zinc-500 w-20 shrink-0 font-mono">
                        {day.slice(5)}
                      </span>
                      <div className="flex-1 h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-emerald-500/60"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-[11px] text-zinc-500 w-6 text-right">
                        {count}
                      </span>
                    </div>
                  )
                })}
            </div>
          )}
        </section>
      </div>
    </>
  )
}
