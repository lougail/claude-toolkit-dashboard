import { cn } from '@/lib/utils'
import type { LucideIcon } from 'lucide-react'

interface MetricCardProps {
  label: string
  value: string | number
  subtitle?: string
  icon: LucideIcon
  trend?: 'up' | 'down' | 'neutral'
}

export function MetricCard({
  label,
  value,
  subtitle,
  icon: Icon,
  trend,
}: MetricCardProps) {
  return (
    <div className="rounded-lg border border-white/[0.06] bg-zinc-900/50 p-4">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-medium uppercase tracking-wider text-zinc-500">
          {label}
        </p>
        <Icon className="h-4 w-4 text-zinc-500" aria-hidden="true" />
      </div>
      <p className="mt-2 text-2xl font-semibold text-zinc-100">{value}</p>
      {subtitle && (
        <p
          className={cn(
            'mt-1 text-xs',
            trend === 'up' && 'text-emerald-400',
            trend === 'down' && 'text-red-400',
            (!trend || trend === 'neutral') && 'text-zinc-500'
          )}
        >
          {subtitle}
        </p>
      )}
    </div>
  )
}
