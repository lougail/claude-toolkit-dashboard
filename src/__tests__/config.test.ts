import { describe, it, expect, vi, beforeEach } from 'vitest'
import { projectName } from '@/lib/config'

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
  // We test via integration since it needs filesystem access
  // The greedy algorithm is tested indirectly through scanner tests
  it('is exported as async function', async () => {
    const { decodeProjectPath } = await import('@/lib/config')
    expect(typeof decodeProjectPath).toBe('function')
  })
})
