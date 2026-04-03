import { watch } from 'chokidar'
import { execFile } from 'node:child_process'
import { discoverProjects } from '@/lib/data/scanner'
import { discoverRalphSessions } from '@/lib/parsers/ralph'
import type { RalphSession } from '@/lib/types'

/**
 * Send a macOS notification via osascript.
 * Fire-and-forget — errors are silently ignored.
 */
function sendMacNotification(title: string, message: string): void {
  const escaped = (s: string) =>
    s.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
  const script = `display notification "${escaped(message)}" with title "${escaped(title)}"`
  execFile('osascript', ['-e', script], { timeout: 5000 }, () => {})
}

/**
 * Detect status transitions between previous and current sessions
 * and send macOS notifications for completed/blocked transitions.
 */
function notifyStatusTransitions(
  previous: RalphSession[],
  current: RalphSession[],
): void {
  const prevByProject = new Map(previous.map((s) => [s.projectName, s]))

  for (const session of current) {
    const prev = prevByProject.get(session.projectName)
    if (!prev || prev.status !== 'running') continue

    if (session.status === 'completed') {
      sendMacNotification(
        'Ralph terminé',
        `${session.projectName} — ${session.tasksDone}/${session.tasksTotal} tâches`,
      )
    } else if (session.status === 'blocked') {
      sendMacNotification(
        'Ralph bloqué',
        `${session.projectName} — ${session.lastAction ?? 'action inconnue'}`,
      )
    }
  }
}

export const dynamic = 'force-dynamic'

/**
 * SSE endpoint that streams Ralph session updates.
 * Watches .ralph/ directories across all discovered projects.
 */
export async function GET(): Promise<Response> {
  const projects = await discoverProjects()

  // Build list of .ralph/ paths to watch
  const watchPaths = projects.map((p) => `${p.path}/.ralph`)

  const encoder = new TextEncoder()
  let watcherClosed = false
  let previousSessions: RalphSession[] = []

  const stream = new ReadableStream({
    async start(controller) {
      // Send initial state immediately
      const sessions = await discoverRalphSessions(projects)
      previousSessions = sessions
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify(sessions)}\n\n`)
      )

      if (watchPaths.length === 0) {
        controller.close()
        return
      }

      // Watch for changes in .ralph/ directories
      const watcher = watch(watchPaths, {
        ignoreInitial: true,
        depth: 1,
        // Only watch key files
        ignored: (path) => {
          const base = path.split('/').pop() ?? ''
          // Watch status.json, fix_plan.md, live.log, progress.json
          if (base === 'status.json' || base === 'fix_plan.md' || base === 'live.log' || base === 'progress.json') return false
          // Watch directories themselves
          if (base === '.ralph') return false
          return true
        },
      })

      let debounceTimer: ReturnType<typeof setTimeout> | null = null

      async function sendUpdate() {
        if (watcherClosed) return
        try {
          const updated = await discoverRalphSessions(projects)
          notifyStatusTransitions(previousSessions, updated)
          previousSessions = updated
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(updated)}\n\n`)
          )
        } catch {
          // connection may have closed
        }
      }

      watcher.on('all', () => {
        // Debounce rapid file changes (Ralph writes multiple files per action)
        if (debounceTimer) clearTimeout(debounceTimer)
        debounceTimer = setTimeout(sendUpdate, 500)
      })

      // Send heartbeat every 15s to keep connection alive
      const heartbeat = setInterval(() => {
        if (watcherClosed) return
        try {
          controller.enqueue(encoder.encode(': heartbeat\n\n'))
        } catch {
          // connection closed
        }
      }, 15_000)

      // Cleanup when the client disconnects
      const cleanup = () => {
        watcherClosed = true
        if (debounceTimer) clearTimeout(debounceTimer)
        clearInterval(heartbeat)
        watcher.close()
      }

      // AbortSignal isn't directly available here, so we rely on
      // the stream's cancel callback
      stream.cancel = () => {
        cleanup()
        return Promise.resolve()
      }
    },
    cancel() {
      watcherClosed = true
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}
