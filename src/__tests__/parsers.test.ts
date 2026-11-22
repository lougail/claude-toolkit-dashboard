import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { writeFile, mkdir, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { parseState } from '@/lib/parsers/state'
import { parseHistory, parseAgentMessages, aggregateTokenUsage } from '@/lib/parsers/jsonl'
import { parseVault } from '@/lib/parsers/markdown'
import { parseRalphSession } from '@/lib/parsers/ralph'

const TEST_DIR = join(tmpdir(), 'dashboard-test-' + Date.now())

beforeAll(async () => {
  await mkdir(TEST_DIR, { recursive: true })
})

afterAll(async () => {
  await rm(TEST_DIR, { recursive: true, force: true })
})

// --- state.ts ---

describe('parseState', () => {
  it('parses valid state.json', async () => {
    const projectDir = join(TEST_DIR, 'project-valid')
    await mkdir(join(projectDir, '.claude'), { recursive: true })
    await writeFile(
      join(projectDir, '.claude', 'state.json'),
      JSON.stringify({
        project: 'test-project',
        updatedAt: '2026-04-01',
        features: [
          {
            slug: 'feat-1',
            status: 'in-progress',
            prd: null,
            ralph: { active: false, branch: null, storiesTotal: 0, storiesDone: 0 },
            audit: { lastDate: null, score: null, blockers: 0 },
            pr: null,
            shipped: false,
          },
        ],
        decisions: { pending: 1, validated: 2, rejected: 0 },
        lastSession: { date: null, branch: null, lastAction: null, nextStep: null },
      })
    )

    const state = await parseState(projectDir)
    expect(state).not.toBeNull()
    expect(state!.project).toBe('test-project')
    expect(state!.features).toHaveLength(1)
    expect(state!.features[0]!.slug).toBe('feat-1')
  })

  it('returns null for missing file', async () => {
    const state = await parseState(join(TEST_DIR, 'nonexistent'))
    expect(state).toBeNull()
  })

  it('returns null for invalid JSON', async () => {
    const projectDir = join(TEST_DIR, 'project-invalid-json')
    await mkdir(join(projectDir, '.claude'), { recursive: true })
    await writeFile(join(projectDir, '.claude', 'state.json'), '{broken')

    const state = await parseState(projectDir)
    expect(state).toBeNull()
  })

  it('returns null for template files', async () => {
    const projectDir = join(TEST_DIR, 'project-template')
    await mkdir(join(projectDir, '.claude'), { recursive: true })
    await writeFile(
      join(projectDir, '.claude', 'state.json'),
      JSON.stringify({
        project: '{{PROJECT_NAME}}',
        updatedAt: '2026-04-01',
        features: [],
        decisions: { pending: 0, validated: 0, rejected: 0 },
        lastSession: { date: null, branch: null, lastAction: null, nextStep: null },
      })
    )

    const state = await parseState(projectDir)
    expect(state).toBeNull()
  })

  it('returns null when updatedAt or lastSession is missing', async () => {
    const projectDir = join(TEST_DIR, 'project-missing-fields')
    await mkdir(join(projectDir, '.claude'), { recursive: true })
    await writeFile(
      join(projectDir, '.claude', 'state.json'),
      JSON.stringify({
        project: 'test',
        features: [],
        decisions: { pending: 0, validated: 0, rejected: 0 },
        // missing updatedAt and lastSession
      })
    )

    const state = await parseState(projectDir)
    expect(state).toBeNull()
  })

  it('filters out malformed features', async () => {
    const projectDir = join(TEST_DIR, 'project-bad-features')
    await mkdir(join(projectDir, '.claude'), { recursive: true })
    await writeFile(
      join(projectDir, '.claude', 'state.json'),
      JSON.stringify({
        project: 'test',
        updatedAt: '2026-04-01',
        features: [
          { slug: 'valid', status: 'planning' },
          { notASlug: true },
          'not-an-object',
          null,
        ],
        decisions: { pending: 0, validated: 0, rejected: 0 },
        lastSession: { date: null, branch: null, lastAction: null, nextStep: null },
      })
    )

    const state = await parseState(projectDir)
    expect(state).not.toBeNull()
    expect(state!.features).toHaveLength(1)
    expect(state!.features[0]!.slug).toBe('valid')
  })

  it('normalizes legacy statuses to v2 phases', async () => {
    const projectDir = join(TEST_DIR, 'project-legacy-statuses')
    await mkdir(join(projectDir, '.claude'), { recursive: true })
    await writeFile(
      join(projectDir, '.claude', 'state.json'),
      JSON.stringify({
        project: 'legacy',
        updatedAt: '2026-04-01',
        features: [
          { slug: 'feat-planning', status: 'planning' },
          { slug: 'feat-inprogress', status: 'in-progress' },
          { slug: 'feat-shipped', status: 'shipped' },
          { slug: 'feat-building', status: 'building' },
        ],
        decisions: { pending: 0, validated: 0, rejected: 0 },
        lastSession: { date: null, branch: null, lastAction: null, nextStep: null },
      })
    )

    const state = await parseState(projectDir)
    expect(state).not.toBeNull()
    expect(state!.features).toHaveLength(4)
    expect(state!.features[0]!.status).toBe('prd')
    expect(state!.features[1]!.status).toBe('building')
    expect(state!.features[2]!.status).toBe('done')
    expect(state!.features[3]!.status).toBe('building')
  })
})

// --- jsonl.ts ---

describe('parseHistory', () => {
  it('parses valid JSONL history', async () => {
    const file = join(TEST_DIR, 'history.jsonl')
    const lines = [
      JSON.stringify({ display: 'Fix bug', timestamp: 1000, project: '/test', sessionId: 's1' }),
      JSON.stringify({ display: 'Add feature', timestamp: 2000, project: '/test', sessionId: 's2' }),
    ]
    await writeFile(file, lines.join('\n'))

    const entries = await parseHistory(file)
    expect(entries).toHaveLength(2)
    expect(entries[0]!.sessionId).toBe('s2') // sorted by most recent
    expect(entries[1]!.sessionId).toBe('s1')
  })

  it('skips malformed lines', async () => {
    const file = join(TEST_DIR, 'history-bad.jsonl')
    const lines = [
      JSON.stringify({ display: 'Good', timestamp: 1000, project: '/test', sessionId: 's1' }),
      '{broken json',
      JSON.stringify({ noTimestamp: true, sessionId: 'bad', project: '/x' }), // missing timestamp
      '',
    ]
    await writeFile(file, lines.join('\n'))

    const entries = await parseHistory(file)
    expect(entries).toHaveLength(1)
    expect(entries[0]!.sessionId).toBe('s1')
  })

  it('returns empty array for missing file', async () => {
    const entries = await parseHistory(join(TEST_DIR, 'nonexistent.jsonl'))
    expect(entries).toEqual([])
  })

  it('returns empty array for empty file', async () => {
    const file = join(TEST_DIR, 'empty.jsonl')
    await writeFile(file, '')
    const entries = await parseHistory(file)
    expect(entries).toEqual([])
  })
})

describe('parseAgentMessages', () => {
  it('parses valid agent messages', async () => {
    const file = join(TEST_DIR, 'agent.jsonl')
    const msg = {
      type: 'assistant',
      sessionId: 's1',
      version: '1.0',
      gitBranch: 'main',
      agentId: 'a1',
      timestamp: '2026-04-01T10:00:00Z',
      message: { role: 'assistant', content: 'hello' },
    }
    await writeFile(file, JSON.stringify(msg))

    const messages = await parseAgentMessages(file)
    expect(messages).toHaveLength(1)
    expect(messages[0]!.sessionId).toBe('s1')
  })

  it('skips entries missing required fields', async () => {
    const file = join(TEST_DIR, 'agent-bad.jsonl')
    const lines = [
      JSON.stringify({ sessionId: 's1', timestamp: '2026-04-01', message: { role: 'assistant' } }), // valid
      JSON.stringify({ noSessionId: true, timestamp: '2026-04-01', message: {} }), // missing sessionId
      JSON.stringify({ sessionId: 's2', timestamp: '2026-04-01' }), // missing message
    ]
    await writeFile(file, lines.join('\n'))

    const messages = await parseAgentMessages(file)
    expect(messages).toHaveLength(1)
  })
})

describe('aggregateTokenUsage', () => {
  it('aggregates tokens by date', () => {
    const messages = [
      {
        type: 'assistant' as const,
        sessionId: 's1',
        version: '1',
        gitBranch: 'main',
        agentId: 'a1',
        timestamp: '2026-04-01T10:00:00Z',
        message: { role: 'assistant', content: '', usage: { input_tokens: 100, output_tokens: 50 } },
      },
      {
        type: 'assistant' as const,
        sessionId: 's1',
        version: '1',
        gitBranch: 'main',
        agentId: 'a1',
        timestamp: '2026-04-01T14:00:00Z',
        message: { role: 'assistant', content: '', usage: { input_tokens: 200, output_tokens: 100 } },
      },
      {
        type: 'assistant' as const,
        sessionId: 's2',
        version: '1',
        gitBranch: 'main',
        agentId: 'a1',
        timestamp: '2026-04-02T10:00:00Z',
        message: { role: 'assistant', content: '', usage: { input_tokens: 50, output_tokens: 25 } },
      },
    ]

    const result = aggregateTokenUsage(messages)
    expect(result).toHaveLength(2)
    expect(result[0]).toEqual({ date: '2026-04-01', input: 300, output: 150 })
    expect(result[1]).toEqual({ date: '2026-04-02', input: 50, output: 25 })
  })

  it('returns empty for no messages', () => {
    expect(aggregateTokenUsage([])).toEqual([])
  })

  it('skips messages without usage', () => {
    const messages = [
      {
        type: 'user' as const,
        sessionId: 's1',
        version: '1',
        gitBranch: 'main',
        agentId: 'a1',
        timestamp: '2026-04-01T10:00:00Z',
        message: { role: 'user', content: 'hello' },
      },
    ]
    expect(aggregateTokenUsage(messages)).toEqual([])
  })
})

// --- markdown.ts ---

describe('parseVault', () => {
  it('parses markdown files with frontmatter', async () => {
    const vaultDir = join(TEST_DIR, 'vault')
    await mkdir(join(vaultDir, 'decisions'), { recursive: true })
    await writeFile(
      join(vaultDir, 'decisions', '2026-04-01-auth-choice.md'),
      `---
title: Use JWT for auth
status: validee
---

We decided to use JWT because...`
    )

    const entries = await parseVault(vaultDir)
    expect(entries).toHaveLength(1)
    expect(entries[0]!.title).toBe('Use JWT for auth')
    expect(entries[0]!.type).toBe('decision')
    expect(entries[0]!.date).toBe('2026-04-01')
    expect(entries[0]!.status).toBe('validee')
    expect(entries[0]!.content).toContain('JWT')
  })

  it('infers type from parent directory', async () => {
    const vaultDir = join(TEST_DIR, 'vault2')
    await mkdir(join(vaultDir, 'ideas'), { recursive: true })
    await mkdir(join(vaultDir, 'insights'), { recursive: true })

    await writeFile(join(vaultDir, 'ideas', 'cool-feature.md'), '---\ntitle: Cool\n---\nContent')
    await writeFile(join(vaultDir, 'insights', 'lesson.md'), '---\ntitle: Lesson\n---\nContent')

    const entries = await parseVault(vaultDir)
    expect(entries).toHaveLength(2)

    const idea = entries.find((e) => e.type === 'idea')
    const insight = entries.find((e) => e.type === 'insight')
    expect(idea).toBeDefined()
    expect(insight).toBeDefined()
  })

  it('returns empty for nonexistent directory', async () => {
    const entries = await parseVault(join(TEST_DIR, 'nonexistent-vault'))
    expect(entries).toEqual([])
  })

  it('handles markdown without frontmatter', async () => {
    const vaultDir = join(TEST_DIR, 'vault3')
    await mkdir(join(vaultDir, 'journal'), { recursive: true })
    await writeFile(join(vaultDir, 'journal', 'note.md'), '# Just a note\n\nNo frontmatter here.')

    const entries = await parseVault(vaultDir)
    expect(entries).toHaveLength(1)
    expect(entries[0]!.title).toBe('note')
    expect(entries[0]!.type).toBe('journal')
  })

  it('keeps an unquoted YAML date as a YYYY-MM-DD string', async () => {
    const vaultDir = join(TEST_DIR, 'vault4')
    await mkdir(join(vaultDir, 'research'), { recursive: true })
    await writeFile(join(vaultDir, 'research', 'sketch.md'), '---\ndate: 2026-06-19\n---\nContent')
    await writeFile(join(vaultDir, 'research', 'other.md'), '---\ndate: "2026-06-20"\n---\nContent')

    const entries = await parseVault(vaultDir)
    expect(entries.map((e) => e.date)).toEqual(['2026-06-20', '2026-06-19'])
  })
})

// --- ralph.ts ---

describe('parseRalphSession', () => {
  it('should return null when .ralph/ does not exist', async () => {
    const result = await parseRalphSession(join(TEST_DIR, 'no-ralph'), 'test')
    expect(result).toBeNull()
  })

  it('should parse status.json and count fix_plan.md checkboxes', async () => {
    const projectDir = join(TEST_DIR, 'ralph-project')
    const ralphDir = join(projectDir, '.ralph')
    await mkdir(ralphDir, { recursive: true })

    await writeFile(
      join(ralphDir, 'status.json'),
      JSON.stringify({
        status: 'running',
        loop_count: 3,
        last_action: 'executing',
        timestamp: '2026-04-03T12:00:00Z',
      })
    )
    await writeFile(
      join(ralphDir, 'fix_plan.md'),
      '# Plan\n- [x] Done task\n- [x] Another done\n- [ ] Pending task\n- [ ] Also pending\n'
    )
    await writeFile(join(ralphDir, 'live.log'), 'line 1\nline 2\nline 3\n')

    const result = await parseRalphSession(projectDir, 'ralph-project')
    expect(result).not.toBeNull()
    expect(result!.status).toBe('running')
    expect(result!.loopCount).toBe(3)
    expect(result!.tasksDone).toBe(2)
    expect(result!.tasksTotal).toBe(4)
    expect(result!.liveLog).toHaveLength(3)
  })

  it('should normalize legacy status values', async () => {
    const projectDir = join(TEST_DIR, 'ralph-completed')
    const ralphDir = join(projectDir, '.ralph')
    await mkdir(ralphDir, { recursive: true })

    await writeFile(
      join(ralphDir, 'status.json'),
      JSON.stringify({ status: 'completed' })
    )

    const result = await parseRalphSession(projectDir, 'done-project')
    expect(result).not.toBeNull()
    expect(result!.status).toBe('completed')
    expect(result!.tasksDone).toBe(0)
    expect(result!.tasksTotal).toBe(0)
  })
})
