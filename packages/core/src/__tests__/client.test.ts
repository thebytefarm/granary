import { execFile } from 'node:child_process'
import { mkdir, mkdtemp, readdir, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { promisify } from 'node:util'

import { isErr } from 'massaman/control'
import { expectSuccess as unwrap } from '#/__tests__/support.ts'
import { describe, expect, expectTypeOf, it, onTestFinished } from 'vitest'

import { createGranary } from '#/client.ts'
import { definePlugin } from '#/plugins/define.ts'
import { resolveSourceInput } from '#/sources/input.ts'

const execute = promisify(execFile)

describe('factory clients', { timeout: 20_000 }, () => {
  it('defers reads until invocation and isolates project-bound plugin capabilities', async () => {
    const first = await workspace()
    const second = await workspace()
    await writeFile(join(first, 'note.md'), 'first')
    await writeFile(join(second, 'note.md'), 'second')
    const notes = definePlugin((options: { readonly path: string }) => ({
      name: 'notes',
      setup({ content }) {
        return { read: () => content.text({ path: options.path }) }
      },
    }))
    const registration = notes({ path: 'note.md' })
    const a = createGranary({ project: first, plugins: [registration] })
    const b = createGranary({ project: second, plugins: [registration] })
    expectTypeOf(a.notes.read).toBeFunction()
    expect('standards' in a).toBe(false)
    expect(unwrap(await a.notes.read())).toBe('first')
    expect(unwrap(await b.notes.read())).toBe('second')
    expect(Object.isFrozen(a)).toBe(true)
    expect(Object.isFrozen(a.packs)).toBe(true)
    expect(Object.isFrozen(a.notes)).toBe(true)
    expect((await readdir(first)).sort()).toEqual(['note.md'])
    const missing = createGranary({ project: join(first, 'not-created') })
    expect(isErr(await missing.content.text({ path: 'missing.md' }))).toBe(true)
  })

  it('calls setup once per client and rejects all collisions before initialization', async () => {
    const project = await workspace()
    const setups: string[] = []
    const plugin = definePlugin({
      name: 'example',
      setup({ project: root }) {
        setups.push(root)
        return { value: 42 }
      },
    })
    const registration = plugin()
    expect(setups).toEqual([])
    createGranary({ project, plugins: [registration] })
    createGranary({ project, plugins: [registration] })
    expect(setups).toEqual([project, project])
    expect(() => createGranary({ project, plugins: [registration, registration] })).toThrowError(
      expect.objectContaining({ kind: 'invalid' })
    )
    expect(setups).toHaveLength(2)
    for (const name of [
      'packs',
      'locks',
      'updates',
      'content',
      'then',
      'constructor',
      '__proto__',
    ]) {
      expect(() =>
        createGranary({
          project,
          plugins: [
            definePlugin({
              name,
              setup() {
                return {}
              },
            })(),
          ],
        })
      ).toThrowError(expect.objectContaining({ kind: 'invalid' }))
    }
    expect(() => createGranary({ project: '' })).toThrowError(
      expect.objectContaining({ kind: 'invalid' })
    )
  })

  it('rejects asynchronous plugin setup even from untyped registrations', async () => {
    const plugin = {
      name: 'invalid',
      setup() {
        return Promise.reject(new Error('Asynchronous setup is not supported.'))
      },
    }
    const project = await workspace()
    expect(() =>
      // @ts-expect-error JavaScript callers may supply asynchronous setup despite the synchronous contract.
      createGranary({ project, plugins: [plugin] })
    ).toThrowError(expect.objectContaining({ kind: 'invalid' }))
  })

  it('adopts docs and code without a manifest and rereads intent between operations', async () => {
    const project = await workspace()
    const source = await workspace()
    await mkdir(join(source, 'docs'))
    await mkdir(join(source, 'src'))
    await writeFile(join(source, 'docs/api.md'), '# API\n')
    await writeFile(join(source, 'src/example.ts'), 'export const value = 1\n')
    await writeFile(join(source, 'private.txt'), 'not selected')
    const client = createGranary({ project })
    const lock = unwrap(
      await client.packs.add({
        source: { provider: 'local', path: source },
        files: { include: ['docs/**', 'src/**'] },
        output: 'reference',
      })
    )
    expect(lock.packs).toHaveLength(1)
    expect(unwrap(await client.packs.list())).toHaveLength(1)
    expect(unwrap(await client.locks.read()).packs).toHaveLength(1)
    expect(unwrap(await client.content.text({ path: 'reference/docs/api.md' }))).toBe('# API\n')
    expect(unwrap(await client.content.text({ path: 'reference/src/example.ts' }))).toContain(
      'value = 1'
    )
    expect(isErr(await client.content.read({ path: '../outside' }))).toBe(true)
    await symlink(join(source, 'private.txt'), join(project, 'escape'))
    expect(isErr(await client.content.read({ path: 'escape' }))).toBe(true)
    await rm(join(project, 'reference/docs/api.md'))
    unwrap(await client.packs.install())
    expect(unwrap(await client.content.text({ path: 'reference/docs/api.md' }))).toBe('# API\n')
    expect(isErr(await client.packs.add({ source: { provider: 'local', path: source } }))).toBe(
      true
    )
  })

  it('locks Git selections and prepares and applies reviewed updates through the same client', async () => {
    const project = await workspace()
    const source = await workspace()
    await writeFile(join(source, 'api.md'), '# First\n')
    await execute('git', ['init', '-b', 'main'], { cwd: source })
    await commit(source)
    const client = createGranary({ project })
    const initial = unwrap(
      await client.packs.add({
        source: {
          provider: 'git',
          repository: pathToFileURL(source).href,
          revision: { branch: 'main' },
        },
        files: { include: ['*.md'] },
        output: 'docs',
      })
    )
    await writeFile(join(source, 'api.md'), '# Second\n')
    await commit(source)
    const review = unwrap(await client.updates.prepare())
    expect(unwrap(await client.content.text({ path: 'docs/api.md' }))).toBe('# First\n')
    const accepted = {
      ...review,
      packs: review.packs.map((pack) => ({
        ...pack,
        files: pack.files.map((file) => ({ ...file, decision: 'incoming' as const })),
      })),
    }
    const updated = unwrap(await client.updates.apply({ review: accepted }))
    expect(updated.packs[0]?.definition.revision).not.toBe(initial.packs[0]?.definition.revision)
    expect(unwrap(await client.content.text({ path: 'docs/api.md' }))).toBe('# Second\n')
    expect(isErr(await client.updates.apply({ review: accepted }))).toBe(true)
    expect(isErr(await client.updates.apply({ review: { schemaVersion: 1 } }))).toBe(true)
  })

  it('validates structured sources and mutually exclusive revisions at runtime', () => {
    const valid = unwrap(
      resolveSourceInput({
        provider: 'github',
        owner: 'vercel',
        repo: 'next.js',
        pack: 'docs',
        revision: { tag: 'v16' },
      })
    )
    expect(valid.locator).toBe('github:vercel/next.js/docs')
    expect(valid.source).toMatchObject({ provider: 'git', revision: { tag: 'v16' } })
    expect(
      unwrap(resolveSourceInput({ provider: 'github', owner: 'vercel', repo: 'next.js' })).source
    ).toMatchObject({ provider: 'git', revision: undefined })
    expect(
      // @ts-expect-error Local sources reject Git revision selectors at the boundary as well as in types.
      isErr(resolveSourceInput({ provider: 'local', path: '.', revision: { branch: 'main' } }))
    ).toBe(true)
    expect(
      isErr(
        resolveSourceInput({
          provider: 'github',
          owner: 'vercel',
          repo: 'next.js',
          // @ts-expect-error Multiple revision selectors are invalid even for JavaScript callers.
          revision: { branch: 'main', tag: 'v16' },
        })
      )
    ).toBe(true)
    expect(
      isErr(resolveSourceInput({ provider: 'github', owner: '../bad', repo: 'next.js' }))
    ).toBe(true)
  })
})

async function workspace(): Promise<string> {
  const path = await mkdtemp(join(tmpdir(), 'granary-client-'))
  onTestFinished(() => rm(path, { recursive: true, force: true }))
  return path
}

async function commit(directory: string): Promise<void> {
  await execute('git', ['add', '.'], { cwd: directory })
  await execute(
    'git',
    [
      '-c',
      'user.name=Test',
      '-c',
      'user.email=test@example.com',
      '-c',
      'commit.gpgsign=false',
      'commit',
      '-m',
      'fixture',
    ],
    { cwd: directory }
  )
}
