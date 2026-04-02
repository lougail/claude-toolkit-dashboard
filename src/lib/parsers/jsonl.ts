import { readFile } from 'node:fs/promises'
import type { SessionEntry, AgentMessage } from '@/lib/types'

function isSessionEntry(v: unknown): v is SessionEntry {
  if (!v || typeof v !== 'object') return false
  const e = v as Record<string, unknown>
  return (
    typeof e.timestamp === 'number' &&
    typeof e.sessionId === 'string' &&
    typeof e.project === 'string'
  )
}

function isAgentMessage(v: unknown): v is AgentMessage {
  if (!v || typeof v !== 'object') return false
  const m = v as Record<string, unknown>
  return (
    typeof m.sessionId === 'string' &&
    typeof m.timestamp === 'string' &&
    m.message !== null &&
    typeof m.message === 'object'
  )
}

/**
 * Parse a JSONL file line by line
 * Uses a validator to skip malformed entries instead of blind `as T`
 */
async function parseJsonl<T>(
  filePath: string,
  validate: (v: unknown) => v is T
): Promise<T[]> {
  try {
    const raw = await readFile(filePath, 'utf-8')
    const lines = raw.trim().split('\n').filter(Boolean)

    return lines.reduce<T[]>((acc, line) => {
      try {
        const parsed: unknown = JSON.parse(line)
        if (validate(parsed)) {
          acc.push(parsed)
        }
      } catch {
        // skip malformed lines
      }
      return acc
    }, [])
  } catch {
    return []
  }
}

/**
 * Parse the global history.jsonl file
 * Returns session entries sorted by most recent first
 */
export async function parseHistory(historyPath: string): Promise<SessionEntry[]> {
  const entries = await parseJsonl(historyPath, isSessionEntry)
  return entries.sort((a, b) => b.timestamp - a.timestamp)
}

/**
 * Parse a subagent JSONL file for token usage and activity data
 */
export async function parseAgentMessages(filePath: string): Promise<AgentMessage[]> {
  return parseJsonl(filePath, isAgentMessage)
}

/**
 * Aggregate token usage from agent messages by date
 */
export function aggregateTokenUsage(
  messages: AgentMessage[]
): { date: string; input: number; output: number }[] {
  const byDate = new Map<string, { input: number; output: number }>()

  for (const msg of messages) {
    if (msg.message?.usage) {
      const date = msg.timestamp?.slice(0, 10) ?? 'unknown'
      const existing = byDate.get(date) ?? { input: 0, output: 0 }
      existing.input += msg.message.usage.input_tokens
      existing.output += msg.message.usage.output_tokens
      byDate.set(date, existing)
    }
  }

  return Array.from(byDate.entries())
    .map(([date, usage]) => ({ date, ...usage }))
    .sort((a, b) => a.date.localeCompare(b.date))
}
