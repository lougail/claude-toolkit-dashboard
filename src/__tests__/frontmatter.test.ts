import { describe, it, expect, afterEach } from 'vitest'
import { parseFrontmatter } from '@/lib/parsers/frontmatter'

/** The property a JavaScript frontmatter of these tests would set on globalThis if its code ran */
const TRACE = '__frontmatterTestRan'

function readTrace(): unknown {
  return (globalThis as Record<string, unknown>)[TRACE]
}

afterEach(() => {
  delete (globalThis as Record<string, unknown>)[TRACE]
})

describe('parseFrontmatter', () => {
  it('should give the fields of a YAML frontmatter and the text after it', () => {
    const { data, content } = parseFrontmatter('---\ntitle: Garder une seule base\n---\n\nLe texte.\n')

    expect(data).toEqual({ title: 'Garder une seule base' })
    expect(content.trim()).toBe('Le texte.')
  })

  it('should give no field when the text has no frontmatter', () => {
    const { data, content } = parseFrontmatter('# Un titre\n')

    expect(data).toEqual({})
    expect(content).toBe('# Un titre\n')
  })

  it('should give no field for an empty text', () => {
    expect(parseFrontmatter('')).toMatchObject({ data: {}, content: '' })
  })

  it.each(['---js', '---javascript', '---JS', '--- js'])(
    'should refuse a frontmatter opened by "%s" without running its code',
    (opening) => {
      const text = `${opening}\n{ title: (globalThis.${TRACE} = true, "x") }\n---\n\nLe texte.\n`

      expect(() => parseFrontmatter(text)).toThrow()
      expect(readTrace()).toBeUndefined()
    }
  )

  it('should throw on an invalid frontmatter again when the same text is read a second time', () => {
    const text = '---\ntitle: [non fermé\n---\n'
    expect(() => parseFrontmatter(text)).toThrow()

    expect(() => parseFrontmatter(text)).toThrow()
  })
})

