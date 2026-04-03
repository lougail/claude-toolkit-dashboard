import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import matter from 'gray-matter'
import { exists } from '@/lib/fs'

export interface SteeringDoc {
  type: 'product' | 'tech' | 'structure'
  exists: boolean
  title: string
  content: string
  /** Key-value pairs extracted from the doc */
  metadata: Record<string, string>
}

const STEERING_FILES = ['product.md', 'tech.md', 'structure.md'] as const
const TYPE_MAP: Record<string, SteeringDoc['type']> = {
  'product.md': 'product',
  'tech.md': 'tech',
  'structure.md': 'structure',
}

export async function parseSteering(projectPath: string): Promise<SteeringDoc[]> {
  const steeringDir = join(projectPath, 'steering')
  const docs: SteeringDoc[] = []

  for (const file of STEERING_FILES) {
    const filePath = join(steeringDir, file)
    const type = TYPE_MAP[file]!
    const fileFound = await exists(filePath)

    if (!fileFound) {
      docs.push({ type, exists: false, title: file, content: '', metadata: {} })
      continue
    }

    try {
      const raw = await readFile(filePath, 'utf-8')
      const { data, content } = matter(raw)

      // Extract first heading as title
      const headingMatch = content.match(/^#\s+(.+)/m)
      const title = headingMatch?.[1] ?? file

      // Extract table rows as metadata (key-value from markdown tables)
      const metadata: Record<string, string> = {}
      if (data && typeof data === 'object') {
        for (const [k, v] of Object.entries(data)) {
          if (typeof v === 'string') metadata[k] = v
        }
      }

      docs.push({ type, exists: true, title, content: content.trim(), metadata })
    } catch {
      docs.push({ type, exists: false, title: file, content: '', metadata: {} })
    }
  }

  return docs
}
