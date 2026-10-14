import { describe, expect, it } from 'vitest'

import { lockfileSchema } from './lock.js'

const SOURCE = { kind: 'local', path: './reference' } as const
const PACK = {
  request: {
    name: 'example/reference',
    source: SOURCE,
    manifest: 'granary.json',
    content: ['docs'],
  },
  definition: { source: SOURCE },
  definitionHash: 'a'.repeat(64),
  definitionVersion: '1.2.3',
  version: '1.2.3',
  output: '.context',
  groups: [
    {
      name: 'docs',
      origin: { source: SOURCE },
      root: '.',
      entry: 'README.md',
      files: [{ path: 'README.md', hash: 'b'.repeat(64) }],
    },
  ],
}

describe('locked installation identities', () => {
  it.each(['.', '..', 'arbitrary-label', '1/../../outside'])(
    'rejects the destination version %s',
    (version) => {
      expect(
        lockfileSchema.safeParse({ schemaVersion: 1, packs: [{ ...PACK, version }] }).success
      ).toBe(false)
    }
  )

  it('rejects an upstream definition that differs from consumer intent', () => {
    expect(
      lockfileSchema.safeParse({
        schemaVersion: 1,
        packs: [{ ...PACK, definition: { source: { kind: 'local', path: './other' } } }],
      }).success
    ).toBe(false)
  })

  it('rejects a valid semantic version that differs from the selected content identity', () => {
    expect(
      lockfileSchema.safeParse({ schemaVersion: 1, packs: [{ ...PACK, version: '2.0.0' }] }).success
    ).toBe(false)
  })

  it('accepts package, definition, and commit versions as separate identities', () => {
    const source = { kind: 'git', repository: 'https://example.com/reference.git', ref: 'main' }
    const commit = 'c'.repeat(40)
    const pack = {
      ...PACK,
      request: { ...PACK.request, source, version: '2.0.0' },
      definition: { source, revision: commit },
      version: '2.0.0',
    }
    expect(lockfileSchema.safeParse({ schemaVersion: 1, packs: [pack] }).success).toBe(true)
    expect(
      lockfileSchema.safeParse({
        schemaVersion: 1,
        packs: [{ ...pack, request: { ...PACK.request, source }, version: commit }],
      }).success
    ).toBe(true)
  })
})
