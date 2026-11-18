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
    expect(await readFile(join(project, 'AGENTS.md'), 'utf8')).toContain(
      '[reference/src/main.ts](reference/src/main.ts)'
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
    await execute('git', ['init', '--quiet', '--initial-branch=main', source])
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

  it('adds another explicit tag without advancing or rewriting an existing installation', async () => {
    const { project, source, client } = await workspace()
    await execute('git', ['init', '--quiet', '--initial-branch=main', source])
    await saveCommit(source)
    await execute('git', ['-C', source, 'tag', 'v16.0.0'])
    const first = unwrap(
      await client.packs.add({
        source: {
          provider: 'git',
          repository: pathToFileURL(source).href,
          revision: { tag: 'v16.0.0' },
        },
        output: 'first',
      })
    )
    await writeFile(join(project, 'first/README.md'), 'Consumer edit\n')
    await writeFile(join(source, 'README.md'), 'Next release\n')
    await saveCommit(source)
    await execute('git', ['-C', source, 'tag', 'v16.1.0'])
    const second = unwrap(
      await client.packs.add({
        source: {
          provider: 'git',
          repository: pathToFileURL(source).href,
          revision: { tag: 'v16.1.0' },
        },
        output: 'second',
      })
    )
    expect(second.packs).toHaveLength(2)
    expect(second.packs[0]).toEqual(first.packs[0])
    expect(await readFile(join(project, 'first/README.md'), 'utf8')).toBe('Consumer edit\n')
    expect(await readFile(join(project, 'second/README.md'), 'utf8')).toBe('Next release\n')
    const config = await readFile(join(project, 'granary.json'), 'utf8')
    const lock = await readFile(join(project, 'granary-lock.json'), 'utf8')
    const duplicate = await client.packs.add({
      source: {
        provider: 'git',
        repository: pathToFileURL(source).href,
        revision: { tag: 'v16.1.0' },
      },
      output: 'duplicate',
    })
    expect(duplicate).toMatchObject({ ok: false, error: { kind: 'conflict' } })
    expect(await readFile(join(project, 'granary.json'), 'utf8')).toBe(config)
    expect(await readFile(join(project, 'granary-lock.json'), 'utf8')).toBe(lock)
    expect(await client.packs.install()).toMatchObject({ ok: false, error: { kind: 'conflict' } })
    expect(await readFile(join(project, 'first/README.md'), 'utf8')).toBe('Consumer edit\n')
    await writeFile(join(project, 'first/README.md'), 'Original reference\n')
    await rm(join(project, 'second'), { recursive: true })
    unwrap(await client.packs.install())
    expect(await readFile(join(project, 'second/README.md'), 'utf8')).toBe('Next release\n')
    expect(await readFile(join(project, 'granary-lock.json'), 'utf8')).toBe(lock)
  })

  it('retrieves a non-default branch and rejects unavailable revisions without writing', async () => {
    const { project, source, client } = await workspace()
    await execute('git', ['init', '--quiet', '--initial-branch=main', source])
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
    const instructions = await readFile(join(project, 'AGENTS.md'), 'utf8')
    expect(instructions).toContain('[reference/README.md](reference/README.md)')
    expect(instructions).toContain('[second/README.md](second/README.md)')
  })

  it('installs a re-rooted selection directly beneath its output and restores it', async () => {
    const { project, source, client } = await workspace()
    await writeStandards(source)
    const lock = unwrap(
      await client.packs.add({
        source: { provider: 'local', path: '../source' },
        files: { root: 'docs/standards/', include: ['**'], exclude: ['drafts/**'] },
        output: 'standards',
      })
    )
    const group = lock.packs[0]?.groups[0]
    expect(group?.root).toBe('docs/standards')
    expect(group?.files.map((file) => file.path)).toEqual(['README.md', 'typescript/naming.md'])
    expect(lock.packs[0]?.request.selection.docs?.path).toBe('docs/standards')
    expect(await readFile(join(project, 'standards/README.md'), 'utf8')).toBe('# Standards\n')
    await expect(access(join(project, 'standards/docs'))).rejects.toMatchObject({
      code: 'ENOENT',
    })
    await expect(access(join(project, 'standards/drafts'))).rejects.toMatchObject({
      code: 'ENOENT',
    })
    expect(await readFile(join(project, 'AGENTS.md'), 'utf8')).toContain(
      '[standards/README.md](standards/README.md)'
    )
    await rm(join(project, 'standards'), { recursive: true })
    unwrap(await client.packs.install())
    expect(await readFile(join(project, 'standards/typescript/naming.md'), 'utf8')).toBe(
      '# Naming\n'
    )
  })

  it('keeps source-relative paths when no root is set', async () => {
    const { source, client } = await workspace()
    await writeStandards(source)
    const lock = unwrap(
      await client.packs.add({
        source: { provider: 'local', path: '../source' },
        files: { include: ['docs/standards/*.md'] },
        output: 'standards',
      })
    )
    expect(lock.packs[0]?.groups[0]?.root).toBe('.')
    expect(lock.packs[0]?.groups[0]?.files.map((file) => file.path)).toEqual([
      'docs/standards/README.md',
    ])
  })

  it.each([
    { root: 'docs/missing', provider: 'local' },
    { root: 'docs/missing', provider: 'git' },
    { root: 'docs/standards/drafts', provider: 'local' },
  ])(
    'rejects a root that selects nothing without writing ($provider $root)',
    async ({ root, provider }) => {
      const { project, source, client } = await workspace()
      await writeStandards(source)
      await rm(join(source, 'docs/standards/drafts/wip.md'))
      await mkdir(join(source, 'docs/standards/drafts'), { recursive: true })
      if (provider === 'git') {
        await execute('git', ['init', '--quiet', '--initial-branch=main', source])
        await saveCommit(source)
      }
      const result = await client.packs.add({
        source: sourceFor({ provider, source }),
        files: { root, include: ['**'] },
        output: 'standards',
      })
      expect(isErr(result) && result.error.kind).toBe('invalid')
      await expect(access(join(project, 'granary-lock.json'))).rejects.toMatchObject({
        code: 'ENOENT',
      })
    }
  )

  it('rejects escaping and symlinked roots', async () => {
    const { root, source, client } = await workspace()
    await mkdir(join(root, 'outside'))
    await writeFile(join(root, 'outside/secret.md'), 'Outside\n')
    await symlink(join(root, 'outside'), join(source, 'linked'))
    const linked = await client.packs.add({
      source: { provider: 'local', path: '../source' },
      files: { root: 'linked', include: ['**'] },
      output: 'standards',
    })
    expect(isErr(linked) && linked.error.kind).toBe('invalid')
    const escape = await client.packs.add({
      source: { provider: 'local', path: '../source' },
      files: { root: '../outside', include: ['**'] },
      output: 'standards',
    })
    expect(isErr(escape) && escape.error.kind).toBe('invalid')
  })

  it('reviews and applies Git updates using re-rooted paths', async () => {
    const { project, source, client } = await workspace()
    await writeStandards(source)
    await execute('git', ['init', '--quiet', '--initial-branch=main', source])
    await saveCommit(source)
    unwrap(
      await client.packs.add({
        source: {
          provider: 'git',
          repository: pathToFileURL(source).href,
          revision: { branch: 'main' },
        },
        files: { root: 'docs/standards', include: ['*.md'] },
        output: 'standards',
      })
    )
    await writeFile(join(source, 'docs/standards/README.md'), '# Revised\n')
    await saveCommit(source)
    const review = unwrap(await client.updates.prepare())
    expect(review.packs[0]?.files.map((file) => file.path)).toEqual(['docs/README.md'])
    const updated = unwrap(
      await client.updates.apply({
        review: {
          ...review,
          packs: review.packs.map((pack) => ({
            ...pack,
            files: pack.files.map((file) => ({ ...file, decision: 'incoming' as const })),
          })),
        },
      })
    )
    expect(updated.packs[0]?.groups[0]?.root).toBe('docs/standards')
    expect(await readFile(join(project, 'standards/README.md'), 'utf8')).toBe('# Revised\n')
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

async function writeStandards(source: string): Promise<void> {
  await mkdir(join(source, 'docs/standards/typescript'), { recursive: true })
  await mkdir(join(source, 'docs/standards/drafts'), { recursive: true })
  await writeFile(join(source, 'docs/standards/README.md'), '# Standards\n')
  await writeFile(join(source, 'docs/standards/typescript/naming.md'), '# Naming\n')
  await writeFile(join(source, 'docs/standards/drafts/wip.md'), '# Draft\n')
}

function sourceFor({ provider, source }: { readonly provider: string; readonly source: string }) {
  if (provider === 'git') {
    return { provider: 'git' as const, repository: pathToFileURL(source).href }
  }
  return { provider: 'local' as const, path: '../source' }
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
