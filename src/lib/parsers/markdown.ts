import { readFile, readdir } from 'node:fs/promises'
import { join, basename } from 'node:path'
import matter from 'gray-matter'
import type { VaultEntry } from '@/lib/types'

/**
 * Parse a markdown file with frontmatter
 */
async function parseMarkdownFile(filePath: string): Promise<VaultEntry | null> {
  try {
    const raw = await readFile(filePath, 'utf-8')
    const { data, content } = matter(raw)

    // Extract date from frontmatter or filename (YYYY-MM-DD-slug.md pattern)
    // gray-matter turns an unquoted YAML date (date: 2026-06-19) into a Date object
    const filenameMatch = basename(filePath).match(/^(\d{4}-\d{2}-\d{2})/)
    const rawDate: unknown = data.date ?? filenameMatch?.[1] ?? ''
    const date = rawDate instanceof Date ? rawDate.toISOString().slice(0, 10) : String(rawDate)

    // Infer type from parent directory name
    const parentDir = filePath.split('/').at(-2) ?? ''
    const typeMap: Record<string, VaultEntry['type']> = {
      ideas: 'idea',
      decisions: 'decision',
      insights: 'insight',
      research: 'research',
      journal: 'journal',
    }

    return {
      title: data.title ?? data.name ?? basename(filePath, '.md'),
      date,
      type: typeMap[parentDir] ?? 'unknown',
      status: data.status ?? data.statut,
      content: content.trim(),
      path: filePath,
    }
  } catch {
    return null
  }
}

/**
 * Recursively find all .md files in a directory
 */
async function findMarkdownFiles(dir: string): Promise<string[]> {
  const results: string[] = []

  try {
    const entries = await readdir(dir, { withFileTypes: true })

    for (const entry of entries) {
      const fullPath = join(dir, entry.name)
      if (entry.isDirectory()) {
        const nested = await findMarkdownFiles(fullPath)
        results.push(...nested)
      } else if (entry.name.endsWith('.md')) {
        results.push(fullPath)
      }
    }
  } catch {
    // directory doesn't exist
  }

  return results
}

/**
 * Parse all markdown files in a vault directory
 */
export async function parseVault(vaultPath: string): Promise<VaultEntry[]> {
  const files = await findMarkdownFiles(vaultPath)
  const entries = await Promise.all(files.map(parseMarkdownFile))

  return entries
    .filter((e): e is VaultEntry => e !== null)
    .sort((a, b) => b.date.localeCompare(a.date))
}
