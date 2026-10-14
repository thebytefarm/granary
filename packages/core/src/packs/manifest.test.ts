import { describe, expect, it } from 'vitest'

import { packManifestSchema } from './manifest.js'

const manifest = {
  name: 'bytefarm/core-standards',
  version: '0.1.0',
  description: 'Core engineering standards for functional TypeScript.',
  entry: 'README.md',
  files: ['**/*.md'],
}

describe('packManifestSchema', () => {
  it('accepts a portable pack and freezes its content selection', () => {
    const result = packManifestSchema.safeParse(manifest)

    expect(result.success).toBe(true)
    if (!result.success) {
      return
    }
    expect(Object.isFrozen(result.data)).toBe(true)
    expect(Object.isFrozen(result.data.files)).toBe(true)
  })

  it.each(['1.0.0-rc.1', '1.2.3+build.5', '1.2.3-rc.1+build.5'])(
    'accepts semantic version %s',
    (version) => {
      expect(packManifestSchema.safeParse({ ...manifest, version }).success).toBe(true)
    }
  )

  it.each(['01.0.0', '1.0', 'latest', '1.0.0-01'])(
    'rejects invalid content version %s',
    (version) => {
      expect(packManifestSchema.safeParse({ ...manifest, version }).success).toBe(false)
    }
  )

  it.each(['/README.md', '../README.md', 'docs/../../README.md', 'C:/README.md', '*.md'])(
    'rejects non-file or non-relative entry %s',
    (entry) => {
      expect(packManifestSchema.safeParse({ ...manifest, entry }).success).toBe(false)
    }
  )

  it.each(['/docs/**', '../**/*.md', 'docs/../**', '!private/**', 'C:/docs/**'])(
    'rejects unsupported include pattern %s',
    (pattern) => {
      expect(packManifestSchema.safeParse({ ...manifest, files: [pattern] }).success).toBe(false)
    }
  )

  it('rejects missing pack metadata', () => {
    expect(packManifestSchema.safeParse({ entry: 'README.md', files: ['**/*.md'] }).success).toBe(
      false
    )
  })

  it('rejects empty content selection', () => {
    expect(packManifestSchema.safeParse({ ...manifest, files: [] }).success).toBe(false)
  })

  it('rejects unknown fields instead of silently ignoring misspellings', () => {
    expect(packManifestSchema.safeParse({ ...manifest, entr: 'docs.md' }).success).toBe(false)
  })
})
