import { execFile } from 'node:child_process'
import { access, mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { promisify } from 'node:util'

import { attemptAsync, isErr, unwrap } from 'massaman/control'
import { describe, expect, it, onTestFinished } from 'vitest'

import { projectConfigSchema } from '../project/config.js'
import type { ProjectConfig } from '../project/config.js'
import { findPacks } from '../sources/manifests.js'
import { addPacks } from './add.js'
import { installPacks } from './install.js'

const execute = promisify(execFile)
const EMPTY_CONFIG: ProjectConfig = { output: '.context', packs: [] }

describe('context installation', { timeout: 15_000 }, () => {
  it('installs only selected content at a destination override', async () => {
    const workspace = await createWorkspace()
    await writeDefinition(workspace.source)
    const lock = unwrap(
      await addPacks({
        ...request(workspace.project),
        content: ['code'],
        version: '1.2.3',
        output: 'reference',
      })
    )
    expect(
      await readFile(
        join(workspace.project, 'reference/repos/example/library/1.2.3/main.ts'),
        'utf8'
      )
    ).toBe('export const answer = 42\n')
    expect(lock.packs[0]?.groups.map((group) => group.name)).toEqual(['code'])
    expect(await readFile(join(workspace.project, 'reference/INDEX.md'), 'utf8')).toContain(
      'repos/example/library/1.2.3/main.ts'
    )
    await expect(access(join(workspace.project, 'reference/docs'))).rejects.toMatchObject({
      code: 'ENOENT',
    })
  })

  it('restores locked local content and keeps consumer paths portable', async () => {
    const workspace = await createWorkspace()
    await writeBundle({ source: workspace.source, name: 'example/local' })
    const locked = unwrap(await addPacks(request(workspace.project)))
    const config = await readConfig(workspace.project)
    expect(config.packs[0]?.source).toEqual({ kind: 'local', path: '../source' })
    expect(locked.packs[0]?.groups[0]?.origin.source).toEqual({ kind: 'local', path: '../source' })
    await rm(join(workspace.project, '.context'), { recursive: true })
    unwrap(await installPacks({ project: workspace.project, config }))
    expect(
      await readFile(join(workspace.project, '.context/docs/example/local/0.1.0/README.md'), 'utf8')
    ).toBe('Original reference\n')
  })

  it('rejects changed local bytes without changing the installed payload', async () => {
    const workspace = await createWorkspace()
    await writeBundle({ source: workspace.source, name: 'example/local' })
    unwrap(await addPacks(request(workspace.project)))
    await writeFile(join(workspace.source, 'README.md'), 'Changed reference\n')
    const result = await installPacks({
      project: workspace.project,
      config: await readConfig(workspace.project),
    })
    expect(isErr(result) && result.error.kind).toBe('drift')
    expect(
      await readFile(join(workspace.project, '.context/docs/example/local/0.1.0/README.md'), 'utf8')
    ).toBe('Original reference\n')
  })

  it('rejects changed definition bytes before restoring a missing payload', async () => {
    const workspace = await createWorkspace()
    await writeBundle({ source: workspace.source, name: 'example/local' })
    unwrap(await addPacks(request(workspace.project)))
    const config = await readConfig(workspace.project)
    await rm(join(workspace.project, '.context'), { recursive: true })
    await writeFile(join(workspace.source, 'granary.json'), '{invalid')
    const result = await installPacks({ project: workspace.project, config })
    expect(isErr(result) && result.error.kind).toBe('drift')
    await expect(access(join(workspace.project, '.context'))).rejects.toMatchObject({
      code: 'ENOENT',
    })
  })

  it('restores a missing managed file without changing config or lock bytes', async () => {
    const workspace = await createWorkspace()
    await writeBundle({ source: workspace.source, name: 'example/local' })
    unwrap(await addPacks(request(workspace.project)))
    const configBytes = await readFile(join(workspace.project, 'granary.config.json'))
    const lockBytes = await readFile(join(workspace.project, 'granary-lock.json'))
    const installed = join(workspace.project, '.context/docs/example/local/0.1.0/README.md')
    await rm(installed)
    unwrap(
      await installPacks({
        project: workspace.project,
        config: await readConfig(workspace.project),
      })
    )
    expect(await readFile(installed, 'utf8')).toBe('Original reference\n')
    expect(await readFile(join(workspace.project, 'granary.config.json'))).toEqual(configBytes)
    expect(await readFile(join(workspace.project, 'granary-lock.json'))).toEqual(lockBytes)
  })

  it('round-trips selected binary files without text decoding', async () => {
    const workspace = await createWorkspace()
    await writeBundle({
      source: workspace.source,
      name: 'example/binary',
      files: ['README.md', 'data.bin'],
    })
    const bytes = Buffer.from([0, 255, 128, 13, 10, 0, 42])
    await writeFile(join(workspace.source, 'data.bin'), bytes)
    unwrap(await addPacks(request(workspace.project)))
    await rm(join(workspace.project, '.context'), { recursive: true })
    unwrap(
      await installPacks({
        project: workspace.project,
        config: await readConfig(workspace.project),
      })
    )
    expect(
      await readFile(join(workspace.project, '.context/docs/example/binary/0.1.0/data.bin'))
    ).toEqual(bytes)
  })

  it('preserves locally edited managed content', async () => {
    const workspace = await createWorkspace()
    await writeBundle({ source: workspace.source, name: 'example/local' })
    unwrap(await addPacks(request(workspace.project)))
    const installed = join(workspace.project, '.context/docs/example/local/0.1.0/README.md')
    await writeFile(installed, 'Personal notes\n')
    const result = await installPacks({
      project: workspace.project,
      config: await readConfig(workspace.project),
    })
    expect(isErr(result) && result.error.kind).toBe('conflict')
    expect(await readFile(installed, 'utf8')).toBe('Personal notes\n')
  })

  it('preserves unmanaged destination files and leaves metadata unwritten on conflict', async () => {
    const workspace = await createWorkspace()
    await writeBundle({ source: workspace.source, name: 'example/local' })
    const destination = join(workspace.project, '.context/docs/example/local/0.1.0')
    await mkdir(destination, { recursive: true })
    await writeFile(join(destination, 'README.md'), 'Unmanaged notes\n')
    const result = await addPacks(request(workspace.project))
    expect(isErr(result) && result.error.kind).toBe('conflict')
    expect(await readFile(join(destination, 'README.md'), 'utf8')).toBe('Unmanaged notes\n')
    await expect(access(join(workspace.project, 'granary-lock.json'))).rejects.toMatchObject({
      code: 'ENOENT',
    })
  })

  it('preserves unrelated files across a successful restore', async () => {
    const workspace = await createWorkspace()
    await writeBundle({ source: workspace.source, name: 'example/local' })
    unwrap(await addPacks(request(workspace.project)))
    const unrelated = join(workspace.project, '.context/docs/example/local/0.1.0/notes.md')
    await writeFile(unrelated, 'Keep me\n')
    unwrap(
      await installPacks({
        project: workspace.project,
        config: await readConfig(workspace.project),
      })
    )
    expect(await readFile(unrelated, 'utf8')).toBe('Keep me\n')
  })

  it('retrieves all groups before writing any project files', async () => {
    const workspace = await createWorkspace()
    await writeDefinition(workspace.source)
    await rm(join(workspace.source, 'implementation'), { recursive: true })
    expect(
      isErr(await addPacks({ ...request(workspace.project), content: ['docs', 'code'] }))
    ).toBe(true)
    await expect(access(join(workspace.project, '.context'))).rejects.toMatchObject({
      code: 'ENOENT',
    })
    await expect(access(join(workspace.project, 'granary.config.json'))).rejects.toMatchObject({
      code: 'ENOENT',
    })
  })

  it('rejects an entrypoint excluded by file selection', async () => {
    const workspace = await createWorkspace()
    await writeBundle({ source: workspace.source, name: 'example/local', files: ['other.md'] })
    await writeFile(join(workspace.source, 'other.md'), 'Other\n')
    const result = await addPacks(request(workspace.project))
    expect(isErr(result) && result.error.kind).toBe('invalid')
  })

  it('rejects source symlinks and escaping output paths', async () => {
    const workspace = await createWorkspace()
    await writeBundle({ source: workspace.source, name: 'example/local' })
    await writeFile(join(workspace.root, 'outside.md'), 'Outside\n')
    await rm(join(workspace.source, 'README.md'))
    await symlink(join(workspace.root, 'outside.md'), join(workspace.source, 'README.md'))
    const symlinkResult = await addPacks(request(workspace.project))
    expect(isErr(symlinkResult) && symlinkResult.error.kind).toBe('invalid')
    const escapeResult = await addPacks({ ...request(workspace.project), output: '../outside' })
    expect(isErr(escapeResult) && escapeResult.error.kind).toBe('invalid')
  })

  it('rejects a symlinked destination root without writing outside the project', async () => {
    const workspace = await createWorkspace()
    await writeBundle({ source: workspace.source, name: 'example/local' })
    const outside = join(workspace.root, 'outside')
    await mkdir(outside)
    await symlink(outside, join(workspace.project, '.context'))
    const result = await addPacks(request(workspace.project))
    expect(isErr(result) && result.error.kind).toBe('invalid')
    await expect(access(join(outside, 'docs'))).rejects.toMatchObject({ code: 'ENOENT' })
  })

  it('requires explicit selection for sources with multiple packs', async () => {
    const workspace = await createWorkspace()
    await writeBundle({ source: join(workspace.source, 'one'), name: 'example/one' })
    await writeBundle({ source: join(workspace.source, 'two'), name: 'example/two' })
    expect(
      unwrap(
        await findPacks({
          project: workspace.project,
          source: { kind: 'local', path: '../source' },
        })
      ).map((pack) => pack.name)
    ).toEqual(['example/one', 'example/two'])
    expect(isErr(await addPacks(request(workspace.project)))).toBe(true)
    const locked = unwrap(
      await addPacks({ ...request(workspace.project), packs: ['one', 'example/two'] })
    )
    expect(locked.packs.map((pack) => pack.request.name)).toEqual(['example/one', 'example/two'])
  })

  it('preserves existing metadata and content when adding an already installed identity', async () => {
    const workspace = await createWorkspace()
    await writeBundle({ source: workspace.source, name: 'example/local' })
    unwrap(await addPacks(request(workspace.project)))
    const configBytes = await readFile(join(workspace.project, 'granary.config.json'))
    const lockBytes = await readFile(join(workspace.project, 'granary-lock.json'))
    const result = await addPacks({
      ...request(workspace.project),
      config: await readConfig(workspace.project),
    })
    expect(isErr(result) && result.error.kind).toBe('conflict')
    expect(await readFile(join(workspace.project, 'granary.config.json'))).toEqual(configBytes)
    expect(await readFile(join(workspace.project, 'granary-lock.json'))).toEqual(lockBytes)
  })

  it('rejects a multi-pack request atomically when one selected payload is missing', async () => {
    const workspace = await createWorkspace()
    await writeBundle({ source: join(workspace.source, 'one'), name: 'example/one' })
    await writeBundle({ source: join(workspace.source, 'two'), name: 'example/two' })
    await rm(join(workspace.source, 'two/README.md'))
    const result = await addPacks({ ...request(workspace.project), packs: ['one', 'two'] })
    expect(isErr(result)).toBe(true)
    await expect(access(join(workspace.project, '.context'))).rejects.toMatchObject({
      code: 'ENOENT',
    })
    await expect(access(join(workspace.project, 'granary.config.json'))).rejects.toMatchObject({
      code: 'ENOENT',
    })
  })

  it('rejects undeclared content groups before writing a destination', async () => {
    const workspace = await createWorkspace()
    await writeBundle({ source: workspace.source, name: 'example/local' })
    const result = await addPacks({ ...request(workspace.project), content: ['code'] })
    expect(isErr(result) && result.error.kind).toBe('invalid')
    await expect(access(join(workspace.project, '.context'))).rejects.toMatchObject({
      code: 'ENOENT',
    })
  })

  it('rejects unknown package versions rather than deriving Git tags', async () => {
    const workspace = await createWorkspace()
    await writeDefinition(workspace.source)
    const result = await addPacks({ ...request(workspace.project), version: '9.0.0' })
    expect(isErr(result) && result.error.message).toContain('No explicit mapping')
  })

  it('restores the locked Git commit after its branch moves', async () => {
    const workspace = await createWorkspace()
    await writeBundle({ source: workspace.source, name: 'example/git' })
    await execute('git', ['init', '--quiet', workspace.source])
    const originalCommit = await saveCommit(workspace.source)
    const source = {
      kind: 'git',
      repository: pathToFileURL(workspace.source).href,
      ref: 'main',
    } as const
    const locked = unwrap(
      await addPacks({ project: workspace.project, config: EMPTY_CONFIG, source })
    )
    expect(locked.packs[0]?.definition.revision).toBe(originalCommit)
    await writeFile(join(workspace.source, 'README.md'), 'New branch content\n')
    await saveCommit(workspace.source)
    await rm(join(workspace.project, '.context'), { recursive: true })
    unwrap(
      await installPacks({
        project: workspace.project,
        config: await readConfig(workspace.project),
      })
    )
    expect(
      await readFile(
        join(workspace.project, `.context/docs/example/git/${originalCommit}/README.md`),
        'utf8'
      )
    ).toBe('Original reference\n')
  })

  it('installs a non-default Git branch rather than requiring a local branch in the clone', async () => {
    const workspace = await createWorkspace()
    await writeBundle({ source: workspace.source, name: 'example/branch' })
    await execute('git', ['init', '--quiet', workspace.source])
    const release = await saveCommit(workspace.source)
    await execute('git', ['-C', workspace.source, 'update-ref', 'refs/heads/release/docs', release])
    await writeFile(join(workspace.source, 'README.md'), 'Main branch reference\n')
    await saveCommit(workspace.source)
    const locked = unwrap(
      await addPacks({
        project: workspace.project,
        config: EMPTY_CONFIG,
        source: {
          kind: 'git',
          repository: pathToFileURL(workspace.source).href,
          ref: 'release/docs',
        },
      })
    )
    expect(locked.packs[0]?.definition.revision).toBe(release)
    expect(
      await readFile(
        join(workspace.project, `.context/docs/example/branch/${release}/README.md`),
        'utf8'
      )
    ).toBe('Original reference\n')
  })

  it('rejects an unavailable Git ref without writing consumer files', async () => {
    const workspace = await createWorkspace()
    await writeBundle({ source: workspace.source, name: 'example/git' })
    await execute('git', ['init', '--quiet', workspace.source])
    await saveCommit(workspace.source)
    const result = await addPacks({
      project: workspace.project,
      config: EMPTY_CONFIG,
      source: { kind: 'git', repository: pathToFileURL(workspace.source).href, ref: 'missing' },
    })
    expect(isErr(result)).toBe(true)
    await expect(access(join(workspace.project, '.context'))).rejects.toMatchObject({
      code: 'ENOENT',
    })
    await expect(access(join(workspace.project, 'granary-lock.json'))).rejects.toMatchObject({
      code: 'ENOENT',
    })
  })

  it.each(['./README.md', 'manual/../README.md'])(
    'handles the entry path %s consistently with file selection',
    async (entry) => {
      const workspace = await createWorkspace()
      await writeBundle({ source: workspace.source, name: 'example/entry', entry })
      const result = await addPacks(request(workspace.project))
      if (entry.includes('..')) {
        expect(isErr(result) && result.error.kind).toBe('invalid')
        return
      }
      const locked = unwrap(result)
      expect(locked.packs[0]?.groups[0]?.entry).toBe('README.md')
      unwrap(
        await installPacks({
          project: workspace.project,
          config: await readConfig(workspace.project),
        })
      )
    }
  )

  it('pins separate Git docs and code sources through explicit package-version mappings', async () => {
    const workspace = await createWorkspace()
    await writeDefinition(workspace.source)
    const docs = join(workspace.source, 'manual')
    const code = join(workspace.source, 'implementation')
    await execute('git', ['init', '--quiet', docs])
    await execute('git', ['init', '--quiet', code])
    const docsCommit = await saveCommit(docs)
    const codeCommit = await saveCommit(code)
    await writeFile(join(docs, 'README.md'), 'New documentation\n')
    await saveCommit(docs)
    await writeFile(join(code, 'main.ts'), 'export const answer = 99\n')
    await saveCommit(code)
    await writeFile(
      join(workspace.source, 'granary.pack.json'),
      JSON.stringify({
        name: 'example/library',
        version: '0.1.0',
        description: 'Mapped Git content',
        groups: {
          docs: {
            source: { kind: 'git', repository: pathToFileURL(docs).href, ref: 'main' },
            entry: 'README.md',
            files: ['**/*.md'],
          },
          code: {
            source: { kind: 'git', repository: pathToFileURL(code).href, ref: 'main' },
            entry: 'main.ts',
            files: ['**/*.ts'],
          },
        },
        versions: { '1.2.3': { docs: docsCommit, code: codeCommit } },
      })
    )
    const locked = unwrap(
      await addPacks({ ...request(workspace.project), version: '1.2.3', content: ['docs', 'code'] })
    )
    expect(locked.packs[0]?.groups.map((group) => group.origin.revision)).toEqual([
      docsCommit,
      codeCommit,
    ])
    await rm(join(workspace.project, '.context'), { recursive: true })
    unwrap(
      await installPacks({
        project: workspace.project,
        config: await readConfig(workspace.project),
      })
    )
    expect(
      await readFile(
        join(workspace.project, '.context/docs/example/library/1.2.3/README.md'),
        'utf8'
      )
    ).toBe('Library docs\n')
    expect(
      await readFile(
        join(workspace.project, '.context/repos/example/library/1.2.3/main.ts'),
        'utf8'
      )
    ).toBe('export const answer = 42\n')
  })

  it('extends an existing installation without rewriting the first pack or losing its index entry', async () => {
    const workspace = await createWorkspace()
    await writeBundle({ source: join(workspace.source, 'one'), name: 'example/one' })
    await writeBundle({ source: join(workspace.source, 'two'), name: 'example/two' })
    unwrap(await addPacks({ ...request(workspace.project), packs: ['one'] }))
    const notes = join(workspace.project, '.context/docs/example/one/0.1.0/notes.md')
    await writeFile(notes, 'Unrelated notes\n')
    const locked = unwrap(
      await addPacks({
        ...request(workspace.project),
        config: await readConfig(workspace.project),
        packs: ['two'],
      })
    )
    expect(locked.packs.map((pack) => pack.request.name)).toEqual(['example/one', 'example/two'])
    expect(await readFile(notes, 'utf8')).toBe('Unrelated notes\n')
    const index = await readFile(join(workspace.project, '.context/INDEX.md'), 'utf8')
    expect(index).toContain('example/one@0.1.0')
    expect(index).toContain('example/two@0.1.0')
  })

  it('ignores consumer object property ordering when checking the lock', async () => {
    const workspace = await createWorkspace()
    await writeBundle({ source: workspace.source, name: 'example/local' })
    unwrap(await addPacks(request(workspace.project)))
    const config = await readConfig(workspace.project)
    const reordered = {
      packs: config.packs.map((pack) => ({
        content: pack.content,
        manifest: pack.manifest,
        source: pack.source,
        name: pack.name,
      })),
      output: config.output,
    }
    expect(isErr(await installPacks({ project: workspace.project, config: reordered }))).toBe(false)
  })
})

function request(project: string) {
  return { project, config: EMPTY_CONFIG, source: { kind: 'local', path: '../source' } as const }
}

async function createWorkspace() {
  const root = await mkdtemp(join(tmpdir(), 'granary-install-'))
  onTestFinished(() => rm(root, { recursive: true, force: true }))
  const project = join(root, 'project')
  const source = join(root, 'source')
  await mkdir(project)
  await mkdir(source)
  return { root, project, source }
}

async function writeBundle({
  source,
  name,
  files = ['**/*.md'],
  entry = 'README.md',
}: {
  readonly source: string
  readonly name: string
  readonly files?: readonly string[]
  readonly entry?: string
}) {
  await mkdir(source, { recursive: true })
  await writeFile(
    join(source, 'granary.json'),
    JSON.stringify({
      name,
      version: '0.1.0',
      description: 'Test reference',
      entry,
      files,
    })
  )
  await writeFile(join(source, 'README.md'), 'Original reference\n')
}

async function writeDefinition(source: string) {
  await mkdir(join(source, 'manual'))
  await mkdir(join(source, 'implementation'))
  await writeFile(join(source, 'manual/README.md'), 'Library docs\n')
  await writeFile(join(source, 'implementation/main.ts'), 'export const answer = 42\n')
  await writeFile(
    join(source, 'granary.pack.json'),
    JSON.stringify({
      name: 'example/library',
      version: '0.1.0',
      description: 'Separate docs and implementation sources',
      groups: {
        docs: {
          source: { kind: 'local', path: './manual' },
          entry: 'README.md',
          files: ['**/*.md'],
        },
        code: {
          source: { kind: 'local', path: './implementation' },
          entry: 'main.ts',
          files: ['**/*.ts'],
        },
      },
      versions: { '1.2.3': {} },
    })
  )
}

async function readConfig(project: string): Promise<ProjectConfig> {
  const raw: unknown = JSON.parse(await readFile(join(project, 'granary.config.json'), 'utf8'))
  return projectConfigSchema.parse(raw)
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
  if (isErr(previous)) {
    return []
  }
  return ['-p', previous.value.stdout.trim()]
}
