'use client'

import { useEffect, useState } from 'react'
import { Sparkline } from '@/components/charts/sparkline'
import { Zap, MessageSquare } from 'lucide-react'

interface SparklineData {
  tokens: number[]
  sessions: number[]
}

/**
 * Self-fetching sparkline widget for the sidebar.
 * Shows 7-day token usage and session count trends.
 */
export function SidebarSparklines() {
  const [data, setData] = useState<SparklineData | null>(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const res = await fetch('/api/sparklines')
        if (!res.ok) return
        const json: unknown = await res.json()
        if (!cancelled && json && typeof json === 'object' && 'tokens' in json && 'sessions' in json) {
          setData(json as SparklineData)
        }
      } catch {
        // Sidebar sparklines are non-critical — fail silently
      }
    }

    load()

    // Refresh every 60s
    const interval = setInterval(load, 60_000)
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [])

  if (!data) return null

  const hasTokenData = data.tokens.some((v) => v > 0)
  const hasSessionData = data.sessions.some((v) => v > 0)

  if (!hasTokenData && !hasSessionData) return null

  return (
    <div className="px-4 py-3 space-y-2.5 border-t border-white/[0.06]">
      <p className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider">
        7-day trend
      </p>
      {hasTokenData && (
        <div className="flex items-center gap-2">
          <Zap className="size-3 text-zinc-500 shrink-0" aria-hidden="true" />
          <Sparkline
            data={data.tokens}
            color="stroke-blue-400"
            label="Token usage over the last 7 days"
            width={100}
            height={20}
          />
        </div>
      )}
      {hasSessionData && (
        <div className="flex items-center gap-2">
          <MessageSquare className="size-3 text-zinc-500 shrink-0" aria-hidden="true" />
          <Sparkline
            data={data.sessions}
            color="stroke-emerald-400"
            label="Session count over the last 7 days"
            width={100}
            height={20}
          />
        </div>
      )}
    </div>
  )
}
