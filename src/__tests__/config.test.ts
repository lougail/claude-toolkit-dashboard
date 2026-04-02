import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { mkdir, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { projectName, decodeProjectPath } from '@/lib/config'

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
