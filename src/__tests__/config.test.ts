import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { mkdir, rm, symlink } from 'node:fs/promises'
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
  const HOME_DIR = join(TEST_ROOT, 'Users', 'louis')

  /** The entry name Claude Code gives a working directory: every character that is not a letter or a digit becomes "-" */
  function encodeAsClaudeCode(path: string): string {
    return path.replace(/[^a-zA-Z0-9]/g, '-')
  }

  beforeAll(async () => {
    // Create a realistic directory tree:
    // /tmp/decode-test-XXX/Users/louis/Developer/hello-mira/
    // /tmp/decode-test-XXX/Users/louis/Developer/simple/
    await mkdir(join(TEST_ROOT, 'Users', 'louis', 'Developer', 'hello-mira'), { recursive: true })
    await mkdir(join(TEST_ROOT, 'Users', 'louis', 'Developer', 'simple'), { recursive: true })
    // A hidden directory, a longer hidden directory that starts the same way,
    // a name that starts with a hyphen, and a name with a dot and an underscore
    await mkdir(join(HOME_DIR, '.tool'), { recursive: true })
    await mkdir(join(HOME_DIR, '.tool-cache', 'sessions', '-42'), { recursive: true })
    await mkdir(join(HOME_DIR, 'Developer', 'my_site.io'), { recursive: true })
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

  it('should decode a hidden directory written with a double dash', async () => {
    const hiddenDir = join(HOME_DIR, '.tool')

    const result = await decodeProjectPath(encodeAsClaudeCode(hiddenDir))

    expect(result).toBe(hiddenDir)
  })

  it('should back up from a hidden directory that leads nowhere to the longer one that matches', async () => {
    const sessionsDir = join(HOME_DIR, '.tool-cache', 'sessions')

    const result = await decodeProjectPath(encodeAsClaudeCode(sessionsDir))

    expect(result).toBe(sessionsDir)
  })

  it('should decode a directory whose name starts with a hyphen', async () => {
    const hyphenDir = join(HOME_DIR, '.tool-cache', 'sessions', '-42')

    const result = await decodeProjectPath(encodeAsClaudeCode(hyphenDir))

    expect(result).toBe(hyphenDir)
  })

  it('should decode a directory name holding a dot and an underscore', async () => {
    const dottedDir = join(HOME_DIR, 'Developer', 'my_site.io')

    const result = await decodeProjectPath(encodeAsClaudeCode(dottedDir))

    expect(result).toBe(dottedDir)
  })

  it('should keep what matches no directory as one name when the project directory is gone', async () => {
    const goneDir = join(HOME_DIR, 'Developer', 'gone-project')

    const result = await decodeProjectPath(encodeAsClaudeCode(goneDir))

    expect(result).toBe(goneDir)
  })

  it('should read the double dash of a directory that is gone as a hidden directory', async () => {
    const goneHiddenDir = join(HOME_DIR, '.gone')

    const result = await decodeProjectPath(encodeAsClaudeCode(goneHiddenDir))

    expect(result).toBe(goneHiddenDir)
  })

  it('should search a directory once when symbolic links lead back to it', async () => {
    // Both links point to the directory that holds them, so each level offers two ways down to the same place.
    // Searching the directory again each time a path reaches it would follow hundreds of thousands of paths.
    // The depth stays under the number of links a system accepts in one path, 32 on macOS.
    const loopDir = join(HOME_DIR, 'loop')
    await mkdir(loopDir, { recursive: true })
    await symlink('.', join(loopDir, 'a'))
    await symlink('.', join(loopDir, 'a-a'))
    const goneDir = join(loopDir, ...Array<string>(28).fill('a'), 'gone')

    const result = await decodeProjectPath(encodeAsClaudeCode(goneDir))

    expect(result).toBe(goneDir)
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
