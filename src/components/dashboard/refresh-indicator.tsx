'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { RefreshCw } from 'lucide-react'

interface RefreshIndicatorProps {
  intervalMs?: number
}

export function RefreshIndicator({ intervalMs = 30_000 }: RefreshIndicatorProps) {
  const router = useRouter()
  const [lastRefresh, setLastRefresh] = useState(Date.now())
  const [secondsAgo, setSecondsAgo] = useState(0)

  useEffect(() => {
    const refreshInterval = setInterval(() => {
      router.refresh()
      setLastRefresh(Date.now())
    }, intervalMs)

    const tickInterval = setInterval(() => {
      setSecondsAgo(Math.floor((Date.now() - lastRefresh) / 1000))
    }, 1000)

    return () => {
      clearInterval(refreshInterval)
      clearInterval(tickInterval)
    }
  }, [intervalMs, router, lastRefresh])

  return (
    <div className="flex items-center gap-1.5 text-[11px] text-zinc-600" aria-live="polite">
      <RefreshCw className="h-3 w-3" aria-hidden="true" />
      <span>
        {secondsAgo < 2 ? 'just now' : `${secondsAgo}s ago`}
      </span>
    </div>
  )
}
