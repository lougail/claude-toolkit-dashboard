import { NextResponse } from 'next/server'
import { collectAgentMessages } from '@/lib/data/scanner'
import { parseHistory, aggregateTokenUsage } from '@/lib/parsers/jsonl'
import { HISTORY_FILE } from '@/lib/config'

export const dynamic = 'force-dynamic'

/**
 * Lightweight endpoint returning 7-day sparkline data for the sidebar.
 * Returns daily totals for tokens (input+output combined) and session counts.
 */
export async function GET() {
  const days = 7
  const cutoffMs = Date.now() - days * 24 * 60 * 60 * 1000
  const cutoffDate = new Date(cutoffMs).toISOString().slice(0, 10)

  const [agentMessages, sessions] = await Promise.all([
    collectAgentMessages(days),
    parseHistory(HISTORY_FILE),
  ])

  // Token usage per day (last 7 days)
  const tokenUsage = aggregateTokenUsage(agentMessages)
    .filter((d) => d.date >= cutoffDate)

  // Fill missing days with zeros for a complete sparkline
  const today = new Date()
  const tokensByDay: number[] = []
  const sessionsByDay: number[] = []

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const dateStr = d.toISOString().slice(0, 10)

    const tokenDay = tokenUsage.find((t) => t.date === dateStr)
    tokensByDay.push(tokenDay ? tokenDay.input + tokenDay.output : 0)

    const sessionCount = sessions.filter((s) => {
      const sDate = new Date(s.timestamp).toISOString().slice(0, 10)
      return sDate === dateStr
    }).length
    sessionsByDay.push(sessionCount)
  }

  return NextResponse.json({
    tokens: tokensByDay,
    sessions: sessionsByDay,
  })
}
