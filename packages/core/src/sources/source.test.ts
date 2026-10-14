import { describe, expect, it } from 'vitest'

import { sourceRevisionSchema, sourceSchema } from './source.js'

describe('source metadata', () => {
  it.each(['\u0000', '\u0001', '\u007f'])(
    'rejects control characters in source paths and repository URLs',
    (character) => {
      expect(
        sourceSchema.safeParse({ kind: 'local', path: `./reference${character}` }).success
      ).toBe(false)
      expect(
        sourceSchema.safeParse({
          kind: 'git',
          repository: `https://example.com/reference${character}.git`,
        }).success
      ).toBe(false)
    }
  )

  it('requires commits only for Git-backed origins', () => {
    expect(
      sourceRevisionSchema.safeParse({
        source: { kind: 'git', repository: 'https://example.com/reference.git' },
      }).success
    ).toBe(false)
    expect(
      sourceRevisionSchema.safeParse({
        source: { kind: 'local', path: './reference' },
        revision: 'a'.repeat(40),
      }).success
    ).toBe(false)
  })
})
