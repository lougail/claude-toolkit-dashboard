import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { mkdir, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { projectName, decodeProjectPath } from '@/lib/config'
import { estimateCost, formatCost } from '@/lib/utils'

describe('projectName', () => {
  it('extracts last segment from a path', () => {
    expect(projectName('/Users/louis/Developer/hello-mira')).toBe('hello-mira')
  })

  it('handles root path', () => {
    expect(projectName('/')).toBe('/')
  })

  it('handles path with trailing slash', () => {
    expect(projectName('/Users/louis/my-project')).toBe('my-project')
  })
})

describe('decodeProjectPath', () => {
  const TEST_ROOT = join(tmpdir(), 'decode-test-' + Date.now())

  beforeAll(async () => {
    // Create a realistic directory tree:
    // /tmp/decode-test-XXX/Users/louis/Developer/hello-mira/
    // /tmp/decode-test-XXX/Users/louis/Developer/simple/
    await mkdir(join(TEST_ROOT, 'Users', 'louis', 'Developer', 'hello-mira'), { recursive: true })
    await mkdir(join(TEST_ROOT, 'Users', 'louis', 'Developer', 'simple'), { recursive: true })
  })

  afterAll(async () => {
    await rm(TEST_ROOT, { recursive: true, force: true })
  })

  it('returns null for empty string', async () => {
    expect(await decodeProjectPath('')).toBeNull()
  })

  it('returns null for single dash', async () => {
    expect(await decodeProjectPath('-')).toBeNull()
  })

  it('returns null for invalid encoded path (no leading dash)', async () => {
    expect(await decodeProjectPath('Users-louis')).toBeNull()
  })

  it('returns null for too-short decoded paths (1 segment)', async () => {
    // "-x" decodes to "/x" — only 1 segment, needs >= 3
    expect(await decodeProjectPath('-x')).toBeNull()
  })

  it('returns null for too-short decoded paths (2 segments)', async () => {
    // "-Users-louis" decodes to "/Users/louis" — only 2 segments, needs >= 3
    expect(await decodeProjectPath('-Users-louis')).toBeNull()
  })

  it('decodes a simple path without hyphens', async () => {
    // Build encoded path relative to our test root
    const encoded = TEST_ROOT.replace(/\//g, '-') + '-Users-louis-Developer-simple'
    const result = await decodeProjectPath(encoded)
    expect(result).toBe(join(TEST_ROOT, 'Users', 'louis', 'Developer', 'simple'))
  })

  it('preserves hyphens in project folder name', async () => {
    const encoded = TEST_ROOT.replace(/\//g, '-') + '-Users-louis-Developer-hello-mira'
    const result = await decodeProjectPath(encoded)
    expect(result).toBe(join(TEST_ROOT, 'Users', 'louis', 'Developer', 'hello-mira'))
  })
})

describe('estimateCost', () => {
  it('should calculate cost using Opus pricing', () => {
    // 1M input at $15/M + 1M output at $75/M = $90
    const cost = estimateCost(1_000_000, 1_000_000)
    expect(cost).toBe(90)
  })

  it('should return 0 for zero tokens', () => {
    expect(estimateCost(0, 0)).toBe(0)
  })

  it('should handle fractional token counts', () => {
    // 500k input = $7.50, 100k output = $7.50 → $15
    const cost = estimateCost(500_000, 100_000)
    expect(cost).toBe(15)
  })
})

describe('formatCost', () => {
  it('should format dollars with 2 decimals', () => {
    expect(formatCost(12.5)).toBe('$12.50')
  })

  it('should format small amounts with 2 decimals', () => {
    expect(formatCost(0.05)).toBe('$0.05')
  })

  it('should format very small amounts with 3 decimals', () => {
    expect(formatCost(0.005)).toBe('$0.005')
  })
})
