import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

import { manifestSchema, packOptionsSchema } from '#/manifests/schema.ts'
import { parsePackLocator } from '#/sources/locator.ts'

describe('curated tool packs', () => {
  it.each([
    'nextjs',
    'react',
    'tanstack-query',
    'tanstack-router',
    'tanstack-start',
    'hono',
    'zod',
    'ai-sdk',
  ])(
    'keeps %s independently installable with pinned upstream docs and attribution',
    async (name) => {
      const path = fileURLToPath(
        new URL(`../../../../../packs/${name}/granary.json`, import.meta.url)
      )
      const document = manifestSchema.parse(JSON.parse(await readFile(path, 'utf8')))
      expect(document.name).toBe(`bytefarm/${name}`)
      expect(document.files).toBeUndefined()
      expect(Object.keys(document.packs ?? {})).toEqual(['docs'])
      const docs = packOptionsSchema.parse(document.packs?.docs)
      expect(docs.commit).toMatch(/^[a-f0-9]{40}$/)
      expect(docs.branch).toBeUndefined()
      expect(docs.tag).toBeUndefined()
      expect(docs.output).toBe('docs')
      expect(docs.files?.include?.some((path) => /license/i.test(path))).toBe(true)
      expect(docs.files?.include?.some((path) => /\*\*\/\*\.mdx?$/.test(path))).toBe(true)
      expect(parsePackLocator({ locator: docs.source ?? '', options: docs }).ok).toBe(true)
    }
  )
})
