import { describe, expect, it } from 'vitest'

import { manifestSchema } from '#/manifests/schema.ts'

describe('manifest schema', () => {
  it('requires only a name and freezes validated selections', () => {
    expect(manifestSchema.safeParse({ name: 'app' }).success).toBe(true)
    const document = manifestSchema.parse({
      name: 'bytefarm/engineering',
      files: { include: ['**/*.md'] },
    })
    expect(Object.isFrozen(document)).toBe(true)
    expect(Object.isFrozen(document.files?.include)).toBe(true)
  })

  it.each(['/docs/**', '../**/*.md', 'docs/../**', '!private/**', 'C:/docs/**'])(
    'rejects unsafe include pattern %s',
    (pattern) => {
      expect(manifestSchema.safeParse({ name: 'app', files: { include: [pattern] } }).success).toBe(
        false
      )
    }
  )

  it('accepts a relative selection root beside its globs', () => {
    const document = manifestSchema.parse({
      name: 'app',
      packs: { 'github:acme/docs': { files: { root: 'docs/standards', include: ['**'] } } },
    })
    expect(document.packs).toEqual({
      'github:acme/docs': { files: { root: 'docs/standards', include: ['**'] } },
    })
  })

  it.each(['/docs', '../docs', 'docs/../..', 'C:/docs', 'docs/**', '', 'docs\\standards'])(
    'rejects unsafe or glob selection root %j',
    (root) => {
      expect(
        manifestSchema.safeParse({ name: 'app', files: { root, include: ['**'] } }).success
      ).toBe(false)
    }
  )

  it('supports intentionally empty selections', () => {
    expect(manifestSchema.safeParse({ name: 'app', files: { include: [] } }).success).toBe(true)
  })

  it.each([
    { schemaVersion: 1, packs: {} },
    { name: 'app', dependencies: {} },
    { name: 'app', entry: 'README.md', files: ['*.md'] },
    { name: 'app', packs: { rules: { includes: ['old@1.0.0'] } } },
    { name: 'app', entr: 'README.md' },
  ])('rejects obsolete fields and misspellings: %j', (document) => {
    expect(manifestSchema.safeParse(document).success).toBe(false)
  })
})
