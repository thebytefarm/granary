import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'
import { isErr } from 'massaman/control'

import { parseStandards } from '#/standards/parser.ts'

const fixture = await readFile(
  new URL('../__fixtures__/standards-pack/immutability.md', import.meta.url),
  'utf8'
)

describe('standards parsing', () => {
  it('retains rationale, examples, literal levels, bracket markers, and Unicode source bytes', async () => {
    const result = await parseStandards({ source: fixture, path: 'immutability.md' })
    expect(result.error).toBeNull()
    if (isErr(result)) {
      return
    }
    expect(result.value).toHaveLength(1)
    expect(result.value[0]).toMatchObject({
      id: 'immutable-values',
      title: 'Immutable values',
      markdown: fixture.trim(),
      why: expect.stringContaining('Zoë'),
      examples: expect.stringContaining('```ts'),
      rules: [
        {
          id: 'preserve-inputs',
          level: 'MUST NOT',
          statement: '- MUST NOT mutate function arguments.',
          enforcement: {
            markers: ['[review]'],
            markdown: expect.stringContaining('resource boundary'),
          },
        },
        {
          id: 'return-new-values',
          level: 'MUST',
          statement: '- MUST return a new value when changing domain data.',
          enforcement: { markers: ['[review]'], markdown: '[review]' },
        },
      ],
    })
    expect(result.value[0]?.examples).toContain('<rule id="example-only">')
  })

  it('preserves literal tags in inline-code enforcement notes', async () => {
    const source = fixture.replace('[review]', '[review]\nReview `<resource>` ownership.')
    const result = await parseStandards({ source, path: 'inline-notes.md' })
    expect(result.error).toBeNull()
    if (!isErr(result)) {
      expect(result.value[0]?.rules[0]?.enforcement.markdown).toContain(
        'Review `<resource>` ownership.'
      )
    }
  })

  it.each(['MUST', 'MUST NOT', 'SHOULD', 'SHOULD NOT', 'MAY'])(
    'extracts the complete %s level',
    async (level) => {
      const result = await parseStandards({
        source: fixture.replace('<level>MUST NOT</level>', `<level>${level}</level>`),
        path: 'rules.md',
      })
      expect(isErr(result)).toBe(false)
      if (!isErr(result)) {
        expect(result.value[0]?.rules[0]?.level).toBe(level)
      }
    }
  )

  it.each([
    ['invalid level', fixture.replace('<level>MUST NOT</level>', '<level>NEVER</level>')],
    ['duplicate IDs', fixture.replace('id="return-new-values"', 'id="preserve-inputs"')],
    ['duplicate regions', fixture.replace('</why>', '</why><why>Another rationale.</why>')],
    ['missing examples', fixture.replace(/<examples>[\s\S]*?<\/examples>/, '')],
    ['XML enforcement', fixture.replace('[review]', '<review />')],
    ['malformed lint marker', fixture.replace('[review]', '[lint:]')],
    ['missing statement', fixture.replace(' mutate function arguments.', '')],
    ['malformed markup', fixture.replace('</standard>', '')],
    ['no standards', '# Ordinary context'],
  ])('rejects %s instead of exporting partial rules', async (_label, source) => {
    const result = await parseStandards({ source, path: 'invalid.md' })
    expect(isErr(result)).toBe(true)
  })
})
