import type { FeatureStatus } from '@/lib/types'

export const FEATURE_STATUS_CONFIG: Record<FeatureStatus, { label: string; color: string }> = {
  idea: { label: 'Idea', color: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30' },
  prd: { label: 'PRD', color: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
  building: { label: 'Building', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  review: { label: 'Review', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
  ship: { label: 'Ship', color: 'bg-orange-500/20 text-orange-400 border-orange-500/30' },
  done: { label: 'Done', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
}

export const FEATURE_STATUSES: FeatureStatus[] = ['idea', 'prd', 'building', 'review', 'ship', 'done']
