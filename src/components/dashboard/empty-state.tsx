import { cn } from '@/lib/utils'
import type { LucideIcon } from 'lucide-react'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description: string
  action?: string
  className?: string
}

export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn('rounded-lg border border-white/[0.06] bg-zinc-900/50 py-12 text-center', className)}>
      <Icon className="mx-auto h-8 w-8 text-zinc-600 mb-3" />
      <p className="text-sm font-medium text-zinc-400">{title}</p>
      <p className="text-xs text-zinc-600 mt-1.5 max-w-md mx-auto">{description}</p>
      {action && (
        <p className="text-xs text-accent mt-3">
          → <code className="bg-zinc-800 px-1.5 py-0.5 rounded text-zinc-300">{action}</code>
        </p>
      )}
    </div>
  )
}
