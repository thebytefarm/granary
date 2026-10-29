import { execFile } from 'node:child_process'
import { access, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { promisify } from 'node:util'

import { attemptAsync, isErr } from 'massaman/control'
import { expectSuccess as unwrap } from '#/__tests__/support.ts'
import { describe, expect, it, onTestFinished } from 'vitest'

import { createGranary } from '#/client.ts'

const execute = promisify(execFile)

describe('declared composition', { timeout: 20_000 }, () => {
  it('installs ordered shared members once at the same destination', async () => {
    const { project, source, client } = await workspace()
    await writeFile(
      join(project, 'granary.json'),
      JSON.stringify({
        name: 'app',
        packs: {
          [`file:${source}#first`]: { output: 'reference' },
          [`file:${source}#second`]: { output: 'reference' },
        },
      })
    )
    const lock = unwrap(await client.packs.install())
    expect(lock.packs.map((pack) => pack.request.label)).toEqual([
      'file:./shared',
      'file:./one',
      'file:./two',
    ])
    expect(
      lock.composition?.definitions.filter(
        (definition) => definition.id.endsWith('#first') || definition.id.endsWith('#second')
      )
    ).toHaveLength(2)
    const index = await readFile(join(project, '.granary/context/INDEX.md'))
    await rm(join(project, 'reference'), { recursive: true })
    unwrap(await client.packs.install())
    expect(await readFile(join(project, '.granary/context/INDEX.md'))).toEqual(index)
  })

  it('adds a set without rewriting a shared component or losing unrelated notes', async () => {
    const { project, source, client } = await workspace()
    unwrap(
      await client.packs.add({
        source: { provider: 'local', path: source, pack: 'first' },
        output: 'reference',
      })
    )
    await writeFile(join(project, 'reference/shared/notes.md'), 'Personal notes\n')
    await writeFile(join(project, 'reference/shared/README.md'), 'Edited shared rules\n')
    const lock = unwrap(
      await client.packs.add({
        source: { provider: 'local', path: source, pack: 'second' },
        output: 'reference',
      })
    )
    expect(lock.packs).toHaveLength(3)
    expect(await readFile(join(project, 'reference/shared/notes.md'), 'utf8')).toBe(
      'Personal notes\n'
    )
    expect(await readFile(join(project, 'reference/shared/README.md'), 'utf8')).toBe(
      'Edited shared rules\n'
    )
  })

  it('rejects a changed shared source without rewriting existing intent or content', async () => {
    const { project, source, client } = await workspace()
    unwrap(
      await client.packs.add({
        source: { provider: 'local', path: source, pack: 'first' },
        output: 'reference',
      })
    )
    const config = await readFile(join(project, 'granary.json'))
    const lock = await readFile(join(project, 'granary-lock.json'))
    await writeFile(join(source, 'shared/README.md'), 'Changed upstream\n')
    const result = await client.packs.add({
      source: { provider: 'local', path: source, pack: 'second' },
      output: 'reference',
    })
    expect(isErr(result) && result.error.kind).toBe('conflict')
    expect(await readFile(join(project, 'granary.json'))).toEqual(config)
    expect(await readFile(join(project, 'granary-lock.json'))).toEqual(lock)
    expect(await readFile(join(project, 'reference/shared/README.md'), 'utf8')).toBe(
      'shared reference\n'
    )
    await expect(access(join(project, 'reference/two'))).rejects.toMatchObject({ code: 'ENOENT' })
  })

  it('rejects conflicting selections before writing any content', async () => {
    const { project, source, client } = await workspace()
    await writeFile(
      join(project, 'granary.json'),
      JSON.stringify({
        name: 'app',
        packs: {
          first: {
            source: `file:${source}/shared`,
            files: { include: ['README.md'] },
            output: 'same',
          },
          second: {
            source: `file:${source}/one`,
            files: { include: ['README.md'] },
            output: 'same',
          },
        },
      })
    )
    const result = await client.packs.install()
    expect(isErr(result) && result.error.kind).toBe('conflict')
    await expect(access(join(project, 'same'))).rejects.toMatchObject({ code: 'ENOENT' })
    await expect(access(join(project, 'granary-lock.json'))).rejects.toMatchObject({
      code: 'ENOENT',
    })
  })

  it('rejects drifted membership before restoring any files', async () => {
    const { project, source, client } = await workspace()
    unwrap(
      await client.packs.add({
        source: { provider: 'local', path: source, pack: 'first' },
        output: 'reference',
      })
    )
    await rm(join(project, 'reference'), { recursive: true })
    await writeFile(
      join(source, 'granary.json'),
      JSON.stringify({
        name: 'sets',
        packs: { first: { packs: { two: { source: 'file:./two' } } } },
      })
    )
    const result = await client.packs.install()
    expect(isErr(result) && result.error.kind).toBe('drift')
    await expect(access(join(project, 'reference'))).rejects.toMatchObject({ code: 'ENOENT' })
  })

  it('rejects tampered member order before restoring any files', async () => {
    const { project, source, client } = await workspace()
    const lock = unwrap(
      await client.packs.add({
        source: { provider: 'local', path: source, pack: 'first' },
        output: 'reference',
      })
    )
    await writeFile(
      join(project, 'granary-lock.json'),
      JSON.stringify({
        ...lock,
        composition: {
          ...lock.composition,
          definitions: lock.composition?.definitions.map((definition) => ({
            ...definition,
            members: definition.members.toReversed(),
          })),
        },
      })
    )
    await rm(join(project, 'reference'), { recursive: true })
    const result = await client.packs.install()
    expect(isErr(result) && result.error.kind).toBe('drift')
    await expect(access(join(project, 'reference'))).rejects.toMatchObject({ code: 'ENOENT' })
  })

  it('excludes consumer output from self-sourced material', async () => {
    const { project, client } = await workspace()
    await mkdir(join(project, 'authored'))
    await writeFile(join(project, 'authored/README.md'), '# Local\n')
    unwrap(
      await client.packs.add({
        source: { provider: 'local', path: './authored' },
        output: 'authored/installed',
      })
    )
    const lock = unwrap(await client.locks.read())
    expect(lock.packs[0]?.groups[0]?.files.map((file) => file.path)).toEqual(['README.md'])
    unwrap(await client.packs.install())
    expect(await readFile(join(project, 'authored/README.md'), 'utf8')).toBe('# Local\n')
  })

  it('pins Git composition and independent member directories to the definition commit', async () => {
    const { project, source, client } = await workspace()
    await execute('git', ['-C', source, 'init', '-b', 'main'])
    const original = await commit(source)
    const lock = unwrap(
      await client.packs.add({
        source: {
          provider: 'git',
          repository: pathToFileURL(source).href,
          pack: 'first',
          revision: { branch: 'main' },
        },
        output: 'reference',
      })
    )
    expect(lock.packs.every((pack) => pack.definition.revision === original)).toBe(true)
    expect(
      lock.packs.every((pack) => pack.groups.every((group) => group.origin.revision === original))
    ).toBe(true)
    await writeFile(join(source, 'shared/README.md'), 'Moved upstream\n')
    await commit(source)
    await rm(join(project, 'reference'), { recursive: true })
    unwrap(await client.packs.install())
    expect(await readFile(join(project, 'reference/shared/README.md'), 'utf8')).toBe(
      'shared reference\n'
    )
  })
})

async function workspace() {
  const root = await mkdtemp(join(tmpdir(), 'granary-composition-'))
  onTestFinished(() => rm(root, { recursive: true, force: true }))
  const project = join(root, 'project')
  const source = join(root, 'source')
  await mkdir(project)
  await mkdir(source)
  await Promise.all(
    ['shared', 'one', 'two'].map(async (name) => {
      await mkdir(join(source, name))
      await writeFile(join(source, name, 'README.md'), `${name} reference\n`)
      await writeFile(
        join(source, name, 'granary.json'),
        JSON.stringify({ name, files: { include: ['README.md'] } })
      )
    })
  )
  await writeFile(
    join(source, 'granary.json'),
    JSON.stringify({
      name: 'sets',
      packs: {
        first: {
          packs: {
            shared: { source: 'file:./shared', output: 'shared' },
            one: { source: 'file:./one', output: 'one' },
          },
        },
        second: {
          packs: {
            shared: { source: 'file:./shared', output: 'shared' },
            two: { source: 'file:./two', output: 'two' },
          },
        },
      },
    })
  )
  return { project, source, client: createGranary({ project }) }
}

async function commit(directory: string): Promise<string> {
  await execute('git', ['-C', directory, 'add', '.'])
  const tree = await execute('git', ['-C', directory, 'write-tree'])
  const parent = await attemptAsync(() =>
    execute('git', ['-C', directory, 'rev-parse', '--verify', 'refs/heads/main'])
  )
  const commit = await execute(
    'git',
    [
      '-C',
      directory,
      'commit-tree',
      tree.stdout.trim(),
      ...parentArgs(parent),
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
  parent: Awaited<ReturnType<typeof attemptAsync<{ stdout: string; stderr: string }>>>
): readonly string[] {
  if (isErr(parent)) return []
  return ['-p', parent.value.stdout.trim()]
}
