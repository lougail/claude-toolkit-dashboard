import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { ProjectState, Feature, FeatureStatus } from '@/lib/types'

/** Map legacy v1 statuses to v2 6-phase workflow */
const LEGACY_STATUS_MAP: Record<string, FeatureStatus> = {
  planning: 'prd',
  'in-progress': 'building',
  shipped: 'done',
}

const VALID_STATUSES = new Set<string>([
  'idea', 'prd', 'building', 'review', 'ship', 'done',
  // Accept legacy statuses too — they'll be normalized
  'planning', 'in-progress', 'shipped',
])

function normalizeStatus(status: string): FeatureStatus {
  return LEGACY_STATUS_MAP[status] ?? (status as FeatureStatus)
}

function isFeature(v: unknown): v is Feature {
  if (!v || typeof v !== 'object') return false
  const f = v as Record<string, unknown>
  return typeof f.slug === 'string' && typeof f.status === 'string' && VALID_STATUSES.has(f.status as string)
}

function isProjectState(v: unknown): v is ProjectState {
  if (!v || typeof v !== 'object') return false
  const d = v as Record<string, unknown>
  if (typeof d.project !== 'string') return false
  if (d.project.includes('{{')) return false // template placeholder
  if (typeof d.updatedAt !== 'string') return false
  if (!Array.isArray(d.features)) return false
  if (!d.decisions || typeof d.decisions !== 'object') return false
  if (!d.lastSession || typeof d.lastSession !== 'object') return false
  return true
}

/**
 * Read and parse a project's state.json
 * Returns null if the file doesn't exist or is invalid
 */
export async function parseState(projectPath: string): Promise<ProjectState | null> {
  const statePath = join(projectPath, '.claude', 'state.json')

  try {
    const raw = await readFile(statePath, 'utf-8')
    const data: unknown = JSON.parse(raw)

    if (!isProjectState(data)) return null

    // Reconstruct with validated features, normalizing legacy statuses
    return {
      ...data,
      features: data.features.filter(isFeature).map((f) => ({
        ...f,
        status: normalizeStatus(f.status),
      })),
    }
  } catch {
    return null
  }
}
