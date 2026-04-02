'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { RefreshCw } from 'lucide-react'

interface RefreshIndicatorProps {
  intervalMs?: number
}

export function RefreshIndicator({ intervalMs = 30_000 }: RefreshIndicatorProps) {
  const router = useRouter()
  const [secondsAgo, setSecondsAgo] = useState(0)
  const lastRefreshRef = useRef(Date.now())

  // Refresh interval — depends only on intervalMs/router
  useEffect(() => {
    const id = setInterval(() => {
      router.refresh()
      lastRefreshRef.current = Date.now()
      setSecondsAgo(0)
    }, intervalMs)
    return () => clearInterval(id)
  }, [intervalMs, router])

  // Tick interval — updates display every second
  useEffect(() => {
    const id = setInterval(() => {
      setSecondsAgo(Math.floor((Date.now() - lastRefreshRef.current) / 1000))
    }, 1000)
    return () => clearInterval(id)
  }, [])

  return (
    <div className="flex items-center gap-1.5 text-[11px] text-zinc-600" aria-live="polite">
      <RefreshCw className="h-3 w-3" aria-hidden="true" />
      <span>
        {secondsAgo < 2 ? 'à l\'instant' : `il y a ${secondsAgo}s`}
      </span>
    </div>
  )
}
