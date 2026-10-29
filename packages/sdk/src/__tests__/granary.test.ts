import { mkdtemp, readdir, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, expectTypeOf, it, onTestFinished } from 'vitest'

import { granary } from '#/granary.ts'

describe('SDK construction', () => {
  it('works without options or plugins and does not mount standards implicitly', () => {
    const client = granary()
    expect(client.packs.install).toBeTypeOf('function')
    expect('standards' in client).toBe(false)
    expect('ok' in client).toBe(false)
    expectTypeOf(client.packs.list).toBeFunction()
  })

  it('returns a plugin-free project client without creating files', async () => {
    const project = await mkdtemp(join(tmpdir(), 'granary-sdk-'))
    onTestFinished(() => rm(project, { recursive: true, force: true }))
    const client = granary({ project })
    expect(await client.packs.list()).toEqual({ ok: true, value: [], error: null })
    expect(await readdir(project)).toEqual([])
    expect('standards' in granary({ project, plugins: [] })).toBe(false)
  })
})
