import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it, onTestFinished } from 'vitest'

import { manifestSchema } from '#/manifests/schema.ts'
import { createConfigurationClient } from '#/workspace/extensions.ts'
import { expectSuccess } from '#/__tests__/support.ts'

describe('namespaced plugin configuration', () => {
  it('preserves unrelated namespaces and leaves plugin-specific validation to plugins', async () => {
    const project = await mkdtemp(join(tmpdir(), 'granary-config-'))
    onTestFinished(() => rm(project, { recursive: true, force: true }))
    const config = {
      name: 'app',
      plugins: { other: { arbitrary: ['data'] }, standards: { pluginOwnsThis: true } },
    }
    await writeFile(join(project, 'granary.json'), JSON.stringify(config))
    const client = createConfigurationClient({ project })
    expect(expectSuccess(await client.readPlugin({ name: 'standards' }))).toEqual({
      pluginOwnsThis: true,
    })
    expectSuccess(await client.configurePlugin({ name: 'notes', value: { path: 'notes.md' } }))
    expect(JSON.parse(await readFile(join(project, 'granary.json'), 'utf8'))).toEqual({
      ...config,
      plugins: { ...config.plugins, notes: { path: 'notes.md' } },
    })
    const before = await readFile(join(project, 'granary.json'), 'utf8')
    expect(await client.configurePlugin({ name: 'notes', value: undefined })).toMatchObject({
      ok: false,
    })
    expect(await readFile(join(project, 'granary.json'), 'utf8')).toBe(before)
  })

  it('rejects the removed top-level standards contract and non-data plugin values', () => {
    expect(manifestSchema.safeParse({ name: 'app', standards: {} }).success).toBe(false)
    expect(
      manifestSchema.safeParse({ name: 'app', plugins: { notes: () => 'code' } }).success
    ).toBe(false)
    expect(
      manifestSchema.safeParse({ name: 'app', plugins: { notes: { arbitrary: true } } }).success
    ).toBe(true)
  })
})
