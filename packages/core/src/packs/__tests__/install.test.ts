import { execFile } from 'node:child_process'
import { access, mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { promisify } from 'node:util'

import { attemptAsync, isErr } from 'massaman/control'
import { expectSuccess as unwrap } from '#/__tests__/support.ts'
import { describe, expect, it, onTestFinished } from 'vitest'

import { createGranary } from '#/client.ts'
import type { BaseGranaryClient } from '#/client.ts'

const execute = promisify(execFile)

describe('pack installation', { timeout: 15_000 }, () => {
  it('installs only selected files at a destination override', async () => {
    const { project, source, client } = await workspace()
    await mkdir(join(source, 'src'))
    await writeFile(join(source, 'src/main.ts'), 'export const answer = 42\n')
    const lock = unwrap(
      await client.packs.add({
        source: { provider: 'local', path: '../source' },
        files: { include: ['src/**'] },
        output: 'reference',
      })
    )
    expect(lock.packs[0]?.groups[0]?.files.map((file) => file.path)).toEqual(['src/main.ts'])
    expect(await readFile(join(project, 'reference/src/main.ts'), 'utf8')).toContain('answer = 42')
    expect(await readFile(join(project, '.granary/context/INDEX.md'), 'utf8')).toContain(
      '../reference/src/main.ts'
    )
    await expect(access(join(project, 'reference/README.md'))).rejects.toMatchObject({
      code: 'ENOENT',
    })
  })

  it('restores locked local content and keeps consumer paths portable', async () => {
    const { project, client } = await workspace()
    const lock = unwrap(await adopt(client))
    expect(lock.packs[0]?.request.source).toEqual({ provider: 'local', path: '../source' })
    expect(lock.packs[0]?.groups[0]?.origin.source).toEqual({
      provider: 'local',
      path: '../source',
    })
    await rm(join(project, 'reference'), { recursive: true })
    unwrap(await client.packs.install())
    expect(await readFile(join(project, 'reference/README.md'), 'utf8')).toBe(
      'Original reference\n'
    )
  })

  it('rejects changed local bytes without changing installed content', async () => {
    const { project, source, client } = await workspace()
    unwrap(await adopt(client))
    await writeFile(join(source, 'README.md'), 'Changed reference\n')
    const result = await client.packs.install()
    expect(isErr(result) && result.error.kind).toBe('drift')
    expect(await readFile(join(project, 'reference/README.md'), 'utf8')).toBe(
      'Original reference\n'
    )
  })

  it.each([
    { document: '{invalid', kind: 'invalid' },
    {
      document: JSON.stringify({ name: 'changed', files: { include: ['README.md'] } }),
      kind: 'drift',
    },
  ])('rejects changed definitions before restoration ($kind)', async ({ document, kind }) => {
    const { project, source, client } = await workspace()
    await writeFile(
      join(source, 'granary.json'),
      JSON.stringify({ name: 'source', files: { include: ['README.md'] } })
    )
    unwrap(await adopt(client))
    await rm(join(project, 'reference'), { recursive: true })
    await writeFile(join(source, 'granary.json'), document)
    const result = await client.packs.install()
    expect(isErr(result) && result.error.kind).toBe(kind)
    await expect(access(join(project, 'reference'))).rejects.toMatchObject({ code: 'ENOENT' })
  })

  it('restores missing files without rewriting configuration or lock bytes', async () => {
    const { project, client } = await workspace()
    unwrap(await adopt(client))
    const config = await readFile(join(project, 'granary.json'))
    const lock = await readFile(join(project, 'granary-lock.json'))
    await rm(join(project, 'reference/README.md'))
    unwrap(await client.packs.install())
    expect(await readFile(join(project, 'reference/README.md'), 'utf8')).toBe(
      'Original reference\n'
    )
    expect(await readFile(join(project, 'granary.json'))).toEqual(config)
    expect(await readFile(join(project, 'granary-lock.json'))).toEqual(lock)
  })

  it('round-trips selected binary files without text decoding', async () => {
    const { project, source, client } = await workspace()
    const bytes = Buffer.from([0, 255, 128, 13, 10, 0, 42])
    await writeFile(join(source, 'data.bin'), bytes)
    unwrap(await adopt(client))
    await rm(join(project, 'reference'), { recursive: true })
    unwrap(await client.packs.install())
    expect(await readFile(join(project, 'reference/data.bin'))).toEqual(bytes)
  })

  it('preserves locally edited managed content', async () => {
    const { project, client } = await workspace()
    unwrap(await adopt(client))
    await writeFile(join(project, 'reference/README.md'), 'Personal notes\n')
    const result = await client.packs.install()
    expect(isErr(result) && result.error.kind).toBe('conflict')
    expect(await readFile(join(project, 'reference/README.md'), 'utf8')).toBe('Personal notes\n')
  })

  it('preserves unmanaged destinations and leaves metadata unwritten on conflict', async () => {
    const { project, client } = await workspace()
    await mkdir(join(project, 'reference'))
    await writeFile(join(project, 'reference/README.md'), 'Unmanaged notes\n')
    const result = await adopt(client)
    expect(isErr(result) && result.error.kind).toBe('conflict')
    expect(await readFile(join(project, 'reference/README.md'), 'utf8')).toBe('Unmanaged notes\n')
    await expect(access(join(project, 'granary-lock.json'))).rejects.toMatchObject({
      code: 'ENOENT',
    })
    await expect(access(join(project, 'granary.json'))).rejects.toMatchObject({ code: 'ENOENT' })
  })

  it('preserves unrelated files during restoration', async () => {
    const { project, client } = await workspace()
    unwrap(await adopt(client))
    await writeFile(join(project, 'reference/notes.md'), 'Keep me\n')
    unwrap(await client.packs.install())
    expect(await readFile(join(project, 'reference/notes.md'), 'utf8')).toBe('Keep me\n')
  })

  it('retrieves every declared member before writing project files', async () => {
    const { project, source, client } = await workspace()
    await writeFile(
      join(source, 'granary.json'),
      JSON.stringify({
        name: 'source',
        packs: {
          docs: { files: { include: ['README.md'] } },
          missing: { source: 'file:./missing' },
        },
      })
    )
    expect(isErr(await adopt(client))).toBe(true)
    await expect(access(join(project, '.granary'))).rejects.toMatchObject({ code: 'ENOENT' })
    await expect(access(join(project, 'reference'))).rejects.toMatchObject({ code: 'ENOENT' })
    await expect(access(join(project, 'granary.json'))).rejects.toMatchObject({ code: 'ENOENT' })
  })

  it('rejects source symlinks and escaping output paths', async () => {
    const { root, source, client } = await workspace()
    await writeFile(join(root, 'outside.md'), 'Outside\n')
    await rm(join(source, 'README.md'))
    await symlink(join(root, 'outside.md'), join(source, 'README.md'))
    const result = await adopt(client)
    expect(isErr(result) && result.error.kind).toBe('invalid')
    const escape = await client.packs.add({
      source: { provider: 'local', path: '../source' },
      output: '../outside',
    })
    expect(isErr(escape) && escape.error.kind).toBe('invalid')
  })

  it('rejects symlinked destinations without writing outside the workspace', async () => {
    const { root, project, client } = await workspace()
    const outside = join(root, 'outside')
    await mkdir(outside)
    await symlink(outside, join(project, 'reference'))
    const result = await adopt(client)
    expect(isErr(result) && result.error.kind).toBe('invalid')
    await expect(access(join(outside, 'README.md'))).rejects.toMatchObject({ code: 'ENOENT' })
  })

  it('preserves metadata when adding an already declared source', async () => {
    const { project, client } = await workspace()
    unwrap(await adopt(client))
    const config = await readFile(join(project, 'granary.json'))
    const lock = await readFile(join(project, 'granary-lock.json'))
    const result = await adopt(client)
    expect(isErr(result) && result.error.kind).toBe('conflict')
    expect(await readFile(join(project, 'granary.json'))).toEqual(config)
    expect(await readFile(join(project, 'granary-lock.json'))).toEqual(lock)
  })

  it('pins a Git commit after the selected branch moves', async () => {
    const { project, source, client } = await workspace()
    await execute('git', ['init', '--quiet', source])
    const first = await saveCommit(source)
    const locked = unwrap(
      await client.packs.add({
        source: {
          provider: 'git',
          repository: pathToFileURL(source).href,
          revision: { branch: 'main' },
        },
        output: 'reference',
      })
    )
    expect(locked.packs[0]?.definition.revision).toBe(first)
    await writeFile(join(source, 'README.md'), 'Moved branch\n')
    await saveCommit(source)
    await rm(join(project, 'reference'), { recursive: true })
    unwrap(await client.packs.install())
    expect(await readFile(join(project, 'reference/README.md'), 'utf8')).toBe(
      'Original reference\n'
    )
  })

  it('retrieves a non-default branch and rejects unavailable revisions without writing', async () => {
    const { project, source, client } = await workspace()
    await execute('git', ['init', '--quiet', source])
    const release = await saveCommit(source)
    await execute('git', ['-C', source, 'update-ref', 'refs/heads/release/docs', release])
    await writeFile(join(source, 'README.md'), 'Main branch\n')
    await saveCommit(source)
    const missing = await client.packs.add({
      source: {
        provider: 'git',
        repository: pathToFileURL(source).href,
        revision: { branch: 'missing' },
      },
      output: 'reference',
    })
    expect(isErr(missing)).toBe(true)
    await expect(access(join(project, 'granary-lock.json'))).rejects.toMatchObject({
      code: 'ENOENT',
    })
    const lock = unwrap(
      await client.packs.add({
        source: {
          provider: 'git',
          repository: pathToFileURL(source).href,
          revision: { branch: 'release/docs' },
        },
        output: 'reference',
      })
    )
    expect(lock.packs[0]?.definition.revision).toBe(release)
    expect(await readFile(join(project, 'reference/README.md'), 'utf8')).toBe(
      'Original reference\n'
    )
  })

  it('extends an installation without rewriting the first pack or losing index entries', async () => {
    const { project, source, client } = await workspace()
    unwrap(await adopt(client))
    await writeFile(join(project, 'reference/notes.md'), 'Unrelated notes\n')
    await mkdir(join(source, 'second'))
    await writeFile(join(source, 'second/README.md'), 'Second\n')
    const lock = unwrap(
      await client.packs.add({
        source: { provider: 'local', path: '../source/second' },
        output: 'second',
      })
    )
    expect(lock.packs).toHaveLength(2)
    expect(await readFile(join(project, 'reference/notes.md'), 'utf8')).toBe('Unrelated notes\n')
    const index = await readFile(join(project, '.granary/context/INDEX.md'), 'utf8')
    expect(index).toContain('../reference/README.md')
    expect(index).toContain('../second/README.md')
  })

  it('compares consumer configuration independently of object property order', async () => {
    const { project, client } = await workspace()
    unwrap(await adopt(client))
    const config = JSON.parse(await readFile(join(project, 'granary.json'), 'utf8'))
    await writeFile(
      join(project, 'granary.json'),
      JSON.stringify({ packs: config.packs, name: config.name })
    )
    expect(isErr(await client.packs.install())).toBe(false)
  })
})

async function workspace() {
  const root = await mkdtemp(join(tmpdir(), 'granary-install-'))
  onTestFinished(() => rm(root, { recursive: true, force: true }))
  const project = join(root, 'project')
  const source = join(root, 'source')
  await mkdir(project)
  await mkdir(source)
  await writeFile(join(source, 'README.md'), 'Original reference\n')
  return { root, project, source, client: createGranary({ project }) }
}

function adopt(client: BaseGranaryClient) {
  return client.packs.add({ source: { provider: 'local', path: '../source' }, output: 'reference' })
}

async function saveCommit(directory: string): Promise<string> {
  await execute('git', ['-C', directory, 'add', '.'])
  const tree = await execute('git', ['-C', directory, 'write-tree'])
  const previous = await attemptAsync(() =>
    execute('git', ['-C', directory, 'rev-parse', '--verify', 'refs/heads/main'])
  )
  const commit = await execute(
    'git',
    [
      '-C',
      directory,
      'commit-tree',
      tree.stdout.trim(),
      ...parentArgs(previous),
      '-m',
      'Fixture revision',
    ],
    {
      env: {
        ...process.env,
        GIT_AUTHOR_NAME: 'Granary Tests',
        GIT_AUTHOR_EMAIL: 'tests@example.com',
        GIT_COMMITTER_NAME: 'Granary Tests',
        GIT_COMMITTER_EMAIL: 'tests@example.com',
      },
    }
  )
  await execute('git', ['-C', directory, 'update-ref', 'refs/heads/main', commit.stdout.trim()])
  return commit.stdout.trim()
}

function parentArgs(
  previous: Awaited<ReturnType<typeof attemptAsync<{ stdout: string; stderr: string }>>>
): readonly string[] {
  if (isErr(previous)) return []
  return ['-p', previous.value.stdout.trim()]
}
