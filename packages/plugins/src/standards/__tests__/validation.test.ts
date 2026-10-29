import { readFile } from 'node:fs/promises'

import { isErr, unwrap } from 'massaman/control'
import { describe, expect, it } from 'vitest'

import { validateStandardsDocuments, validateStandardsUpdate } from '#/standards/validation.ts'

describe('standards review validation', () => {
  it('does not interpret ordinary context', async () => {
    const result = await validateStandardsDocuments([
      {
        locked: { documents: {} },
        files: [{ path: 'notes.md', content: Buffer.from('<standard id="unfinished">') }],
      },
    ])
    expect(isErr(result)).toBe(false)
  })

  it('rejects incomplete classified standards', async () => {
    const result = await validateStandardsDocuments([
      {
        locked: { documents: { 'rules.md': 'standards' } },
        files: [{ path: 'rules.md', content: Buffer.from('<standard id="unfinished">') }],
      },
    ])
    expect(isErr(result)).toBe(true)
  })

  it('rejects duplicate standard IDs across reviewed documents in the same pack', async () => {
    const content = await readFile(
      new URL('../__fixtures__/standards-pack/immutability.md', import.meta.url)
    )
    const result = await validateStandardsDocuments([
      {
        locked: { documents: { 'first.md': 'standards', 'second.md': 'standards' } },
        files: [
          { path: 'first.md', content },
          { path: 'second.md', content },
        ],
      },
    ])
    expect(isErr(result) && result.error.message).toContain('unique across documents')
  })

  it('allows the same standard IDs in independent packs and ignores unaffected mappings', async () => {
    const content = await readFile(
      new URL('../__fixtures__/standards-pack/immutability.md', import.meta.url)
    )
    const groups = [
      {
        locked: { documents: { 'rules.md': 'standards' } },
        files: [{ path: 'rules.md', content }],
      },
    ]
    unwrap(
      await validateStandardsUpdate({
        packs: [
          { name: 'first', groups },
          { name: 'second', groups },
        ],
        names: ['first', 'second'],
        settings: {
          default: '[review]',
          rules: { 'unaffected#standard/rule': { markers: ['[review]'] } },
        },
      })
    )
  })
})
