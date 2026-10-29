import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it, onTestFinished } from 'vitest'

import { createGranary } from '#/client.ts'
import { definePlugin } from '#/plugins/define.ts'
import { expectSuccess } from '#/__tests__/support.ts'

describe('plugin update policies', () => {
  it('refuses a policy failure before writing content, intent, or lock state', async () => {
    const project = await temporaryDirectory()
    const source = await temporaryDirectory()
    await writeFile(join(source, 'note.md'), 'before\n')
    const plugin = definePlugin({
      name: 'policy',
      setup() {
        return {}
      },
      async validateUpdate({ upstream, effective, names, configuration }) {
        expect(upstream[0]?.groups[0]?.files[0]?.content.toString()).toBe('after\n')
        expect(effective[0]?.groups[0]?.files[0]?.content.toString()).toBe('after\n')
        expect(names).toHaveLength(1)
        expect(configuration).toEqual({})
        return { ok: false, value: null, error: new Error('Rejected by policy.') }
      },
    })
    const client = createGranary({ project, plugins: [plugin()] })
    expectSuccess(
      await client.packs.add({
        source: { provider: 'local', path: source },
        files: { include: ['note.md'] },
        output: 'reference',
      })
    )
    await writeFile(join(source, 'note.md'), 'after\n')
    const review = expectSuccess(await client.updates.prepare())
    const before = await Promise.all(
      ['granary.json', 'granary-lock.json', 'reference/note.md'].map((path) =>
        readFile(join(project, path), 'utf8')
      )
    )
    const applied = await client.updates.apply({ review })
    expect(applied).toMatchObject({
      ok: false,
      error: { kind: 'invalid', message: 'Rejected by policy.' },
    })
    expect(
      await Promise.all(
        ['granary.json', 'granary-lock.json', 'reference/note.md'].map((path) =>
          readFile(join(project, path), 'utf8')
        )
      )
    ).toEqual(before)
    const withoutPlugins = createGranary({ project })
    expectSuccess(await withoutPlugins.updates.apply({ review }))
    expect(await readFile(join(project, 'reference/note.md'), 'utf8')).toBe('after\n')
  })

  it('contains rejected validator promises as classified failures', async () => {
    const project = await temporaryDirectory()
    const source = await temporaryDirectory()
    await writeFile(join(source, 'note.md'), 'before\n')
    const plugin = definePlugin({
      name: 'policy',
      setup() {
        return {}
      },
      validateUpdate: () => Promise.reject(new Error('Policy unavailable.')),
    })
    const client = createGranary({ project, plugins: [plugin()] })
    expectSuccess(
      await client.packs.add({
        source: { provider: 'local', path: source },
        files: { include: ['note.md'] },
        output: 'reference',
      })
    )
    await writeFile(join(source, 'note.md'), 'after\n')
    const review = expectSuccess(await client.updates.prepare())
    expect(await client.updates.apply({ review })).toMatchObject({
      ok: false,
      error: { kind: 'invalid', cause: { message: 'Policy unavailable.' } },
    })
    expect(await readFile(join(project, 'reference/note.md'), 'utf8')).toBe('before\n')
  })
})

async function temporaryDirectory(): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), 'granary-policy-'))
  onTestFinished(() => rm(directory, { recursive: true, force: true }))
  return directory
}
