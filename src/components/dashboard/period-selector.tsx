'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

const PERIODS = [
  { value: '7', label: '7d' },
  { value: '14', label: '14d' },
  { value: '30', label: '30d' },
] as const

export function PeriodSelector() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const current = searchParams.get('days') ?? '30'

  function handleSelect(days: string) {
    const params = new URLSearchParams(searchParams)
    params.set('days', days)
    router.push(`${pathname}?${params.toString()}`)
  }

  return (
    <div className="inline-flex rounded-md border border-white/[0.06] bg-zinc-900/50" role="group" aria-label="Period selector">
      {PERIODS.map(({ value, label }) => (
        <button
          key={value}
          type="button"
          onClick={() => handleSelect(value)}
          aria-pressed={current === value}
          className={cn(
            'px-3 py-1.5 text-xs font-medium transition-colors first:rounded-l-md last:rounded-r-md',
            current === value
              ? 'bg-zinc-700 text-zinc-100'
              : 'text-zinc-500 hover:text-zinc-300'
          )}
        >
          {label}
        </button>
      ))}
    </div>
  )
}
