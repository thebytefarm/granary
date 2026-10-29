import { mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { isErr, unwrap } from 'massaman/control'
import { describe, expect, it, onTestFinished } from 'vitest'
import { z } from 'zod'

import { createFilesystemClient } from '#/filesystem.ts'

describe('root-bound filesystem', () => {
  it('reads validated JSON, atomically replaces content, finds files, and removes only its target', async () => {
    const root = await workspace()
    const filesystem = createFilesystemClient({ root })
    unwrap(await filesystem.write({ path: 'nested/manifest.json', content: '{"name":"first"}' }))
    expect(
      unwrap(
        await filesystem.readJSON({
          path: 'nested/manifest.json',
          schema: z.object({ name: z.string() }),
        })
      )
    ).toEqual({ name: 'first' })
    unwrap(await filesystem.write({ path: 'nested/manifest.json', content: '{"name":"second"}' }))
    expect(unwrap(await filesystem.find({ patterns: ['**/*.json'] }))).toEqual([
      'nested/manifest.json',
    ])
    expect(unwrap(await filesystem.read({ path: 'nested/manifest.json' })).toString()).toBe(
      '{"name":"second"}'
    )
    unwrap(await filesystem.remove({ path: 'nested/manifest.json' }))
    expect(unwrap(await filesystem.exists({ path: 'nested/manifest.json' }))).toBe(false)
    expect(isErr(await filesystem.read({ path: 'nested/manifest.json' }))).toBe(true)
  })

  it('rejects traversal and symlink paths for reads, writes, discovery, existence, and removal', async () => {
    const root = await workspace()
    const outside = await workspace()
    await writeFile(join(outside, 'private.json'), '{"private":true}')
    await symlink(outside, join(root, 'linked'))
    const filesystem = createFilesystemClient({ root })
    for (const path of ['linked/private.json', '../private.json']) {
      expect(isErr(await filesystem.read({ path }))).toBe(true)
      expect(isErr(await filesystem.readJSON({ path, schema: z.unknown() }))).toBe(true)
      expect(isErr(await filesystem.exists({ path }))).toBe(true)
      expect(isErr(await filesystem.write({ path, content: 'changed' }))).toBe(true)
      expect(isErr(await filesystem.remove({ path }))).toBe(true)
      expect(isErr(await filesystem.find({ patterns: [path] }))).toBe(true)
    }
    expect(await readFile(join(outside, 'private.json'), 'utf8')).toBe('{"private":true}')
  })

  it('classifies malformed JSON and schema mismatches without throwing', async () => {
    const root = await workspace()
    const filesystem = createFilesystemClient({ root })
    await writeFile(join(root, 'malformed.json'), '{invalid')
    await writeFile(join(root, 'mismatch.json'), '{"name":7}')
    for (const path of ['malformed.json', 'mismatch.json']) {
      const result = await filesystem.readJSON({ path, schema: z.object({ name: z.string() }) })
      expect(isErr(result)).toBe(true)
      if (isErr(result)) {
        expect(result.error.kind).toBe('invalid')
      }
    }
  })

  it('scopes operations to an existing checked directory and rejects escaping paths', async () => {
    const root = await workspace()
    const filesystem = createFilesystemClient({ root })
    unwrap(await filesystem.write({ path: 'nested/note.md', content: 'Scoped\n' }))
    const scoped = unwrap(await filesystem.scope({ path: 'nested' }))
    expect(unwrap(await scoped.read({ path: 'note.md' })).toString()).toBe('Scoped\n')
    expect(isErr(await scoped.read({ path: '../outside.md' }))).toBe(true)
    expect(isErr(await filesystem.scope({ path: '../outside' }))).toBe(true)
    await symlink(root, join(root, 'linked'))
    expect(isErr(await filesystem.scope({ path: 'linked' }))).toBe(true)
  })
})

async function workspace(): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), 'granary-filesystem-'))
  onTestFinished(() => rm(directory, { recursive: true, force: true }))
  return directory
}
