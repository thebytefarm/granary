import { describe, expect, it } from 'vitest'

import { sourceRevisionSchema, sourceSchema, sourceReference } from '#/sources/source.ts'
import { sourceSchema as sourceInputSchema } from '#/sources/schema.ts'
import { parsePackLocator } from '#/sources/locator.ts'
import { unwrap } from 'massaman/control'

describe('source metadata', () => {
  it.each(['\u0000', '\u0001', '\u007f'])(
    'rejects control characters in source paths and repository URLs',
    (character) => {
      expect(
        sourceSchema.safeParse({ provider: 'local', path: `./reference${character}` }).success
      ).toBe(false)
      expect(
        sourceSchema.safeParse({
          provider: 'git',
          repository: `https://example.com/reference${character}.git`,
        }).success
      ).toBe(false)
    }
  )

  it('requires commits only for Git-backed origins', () => {
    expect(
      sourceRevisionSchema.safeParse({
        source: { provider: 'git', repository: 'https://example.com/reference.git' },
      }).success
    ).toBe(false)
    expect(
      sourceRevisionSchema.safeParse({
        source: { provider: 'local', path: './reference' },
        revision: 'a'.repeat(40),
      }).success
    ).toBe(false)
  })

  it.each([
    { revision: { branch: 'release/docs' }, reference: 'refs/heads/release/docs' },
    { revision: { tag: 'release/docs' }, reference: 'refs/tags/release/docs' },
    { revision: { commit: 'a'.repeat(40) }, reference: 'a'.repeat(40) },
    { revision: undefined, reference: 'HEAD' },
  ])('shares structured Git intent with the SDK: $reference', ({ revision, reference }) => {
    const source = {
      provider: 'git' as const,
      repository: 'https://example.com/reference.git',
      revision,
    }
    expect(sourceInputSchema.safeParse(source).success).toBe(true)
    expect(sourceSchema.parse(source)).toEqual(source)
    expect(sourceReference(source)).toBe(reference)
    expect(
      unwrap(
        parsePackLocator({ locator: 'git+https://example.com/reference.git', options: revision })
      ).source
    ).toEqual(source)
  })

  it('retains manifest shorthand without converting it into a branch selector', () => {
    const source = {
      provider: 'git' as const,
      repository: 'https://example.com/reference.git',
      revision: 'release',
    }
    expect(sourceSchema.safeParse(source).success).toBe(true)
    expect(sourceReference(source)).toBe('release')
    expect(sourceInputSchema.safeParse(source).success).toBe(false)
  })

  it.each([
    { kind: 'local', path: '.' },
    { kind: 'git', repository: 'https://example.com/reference.git', ref: 'HEAD' },
    { provider: 'git', repository: 'https://example.com/reference.git', ref: 'HEAD' },
  ])('rejects obsolete transport source fields: %j', (source) => {
    expect(sourceSchema.safeParse(source).success).toBe(false)
  })
})
