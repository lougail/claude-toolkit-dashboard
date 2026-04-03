'use client'

import { useEffect, useState, useRef } from 'react'
import { Bot, Loader2, CheckCircle2, AlertTriangle, CircleDashed } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { RalphSession } from '@/lib/types'

const STATUS_CONFIG = {
  running: {
    icon: Loader2,
    label: 'Running',
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10 border-blue-500/20',
    animate: true,
  },
  completed: {
    icon: CheckCircle2,
    label: 'Completed',
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/10 border-emerald-500/20',
    animate: false,
  },
  blocked: {
    icon: AlertTriangle,
    label: 'Blocked',
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/10 border-amber-500/20',
    animate: false,
  },
  unknown: {
    icon: CircleDashed,
    label: 'Unknown',
    color: 'text-zinc-500',
    bgColor: 'bg-zinc-500/10 border-zinc-500/20',
    animate: false,
  },
} as const

function RalphCard({ session }: { session: RalphSession }) {
  const config = STATUS_CONFIG[session.status]
  const Icon = config.icon
  const progress = session.tasksTotal > 0
    ? Math.round((session.tasksDone / session.tasksTotal) * 100)
    : 0

  return (
    <div className={cn('rounded-lg border p-3', config.bgColor)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon
            className={cn('size-4', config.color, config.animate && 'animate-spin')}
            aria-hidden="true"
          />
          <span className="text-sm font-medium text-zinc-200">
            {session.projectName}
          </span>
        </div>
        <span className={cn('text-[11px] font-medium', config.color)}>
          {config.label}
        </span>
      </div>

      {/* Progress bar */}
      {session.tasksTotal > 0 && (
        <div className="mt-2">
          <div className="flex items-center justify-between text-[11px] text-zinc-500 mb-1">
            <span>Tasks</span>
            <span>{session.tasksDone}/{session.tasksTotal} ({progress}%)</span>
          </div>
          <div className="h-1.5 rounded-full bg-zinc-800 overflow-hidden">
            <div
              className="h-full rounded-full bg-blue-500 transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Meta info */}
      <div className="flex items-center gap-3 mt-2 text-[11px] text-zinc-500">
        {session.loopCount > 0 && (
          <span>Loop {session.loopCount}</span>
        )}
        {session.lastAction && (
          <span className="truncate">{session.lastAction}</span>
        )}
      </div>

      {/* Live log (last few lines) */}
      {session.liveLog.length > 0 && session.status === 'running' && (
        <div className="mt-2 rounded bg-zinc-900/50 px-2 py-1.5 max-h-24 overflow-y-auto">
          {session.liveLog.slice(-4).map((line, i) => (
            <p key={i} className="text-[10px] text-zinc-500 font-mono leading-relaxed truncate">
              {line}
            </p>
          ))}
        </div>
      )}
    </div>
  )
}

interface RalphTrackerProps {
  initialSessions: RalphSession[]
}

export function RalphTracker({ initialSessions }: RalphTrackerProps) {
  const [sessions, setSessions] = useState<RalphSession[]>(initialSessions)
  const eventSourceRef = useRef<EventSource | null>(null)

  useEffect(() => {
    const es = new EventSource('/api/ralph-stream')
    eventSourceRef.current = es

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as RalphSession[]
        setSessions(data)
      } catch {
        // ignore parse errors
      }
    }

    es.onerror = () => {
      // Auto-reconnect is built into EventSource
      // Just log for debugging
    }

    return () => {
      es.close()
      eventSourceRef.current = null
    }
  }, [])

  if (sessions.length === 0) return null

  const running = sessions.filter((s) => s.status === 'running')
  const others = sessions.filter((s) => s.status !== 'running')

  return (
    <section
      className="rounded-lg border border-white/[0.06] bg-zinc-900/50 p-4"
      aria-label="Ralph agent tracking"
    >
      <div className="flex items-center gap-2 mb-4">
        <Bot className="size-4 text-zinc-400" aria-hidden="true" />
        <h2 className="text-sm font-medium text-zinc-300">Ralph Sessions</h2>
        {running.length > 0 && (
          <span className="inline-flex items-center rounded-full bg-blue-500/10 px-2 py-0.5 text-[10px] font-medium text-blue-400">
            {running.length} active
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {/* Show running sessions first */}
        {running.map((session) => (
          <RalphCard key={session.projectPath} session={session} />
        ))}
        {others.map((session) => (
          <RalphCard key={session.projectPath} session={session} />
        ))}
      </div>
    </section>
  )
}
