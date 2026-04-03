import { watch } from 'chokidar'
import { discoverProjects } from '@/lib/data/scanner'
import { discoverRalphSessions } from '@/lib/parsers/ralph'

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

  const stream = new ReadableStream({
    async start(controller) {
      // Send initial state immediately
      const sessions = await discoverRalphSessions(projects)
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
