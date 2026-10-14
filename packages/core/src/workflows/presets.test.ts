import { execFile } from 'node:child_process'
import { access, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { promisify } from 'node:util'

import { isErr, unwrap } from 'massaman/control'
import { describe, expect, it, onTestFinished } from 'vitest'

import { presetSchema } from '../packs/preset.js'
import { projectConfigSchema } from '../project/config.js'
import { lockfileSchema } from '../project/lock.js'
import { mapLimited } from '../map-limited.js'
import { findPacks } from '../sources/manifests.js'
import { addPacks } from './add.js'
import { installPacks } from './install.js'

const execute = promisify(execFile)

describe('flat presets', { timeout: 15_000 }, () => {
  it('discovers presets alongside components and installs ordered deduplicated members', async () => {
    const workspace = await createWorkspace()
    const catalog = unwrap(
      await findPacks({ project: workspace.project, source: workspace.source })
    )
    expect(catalog.filter((entry) => entry.kind === 'preset').map((entry) => entry.name)).toEqual([
      'example/first',
      'example/second',
    ])
    const lock = unwrap(
      await addPacks({
        ...workspace,
        config: { output: '.context', packs: [] },
        packs: ['first', 'second'],
      })
    )
    expect(lock.packs.map((pack) => pack.request.name)).toEqual([
      'example/shared',
      'example/one',
      'example/two',
    ])
    expect(lock.presets?.map((preset) => preset.request.name)).toEqual([
      'example/first',
      'example/second',
    ])
    const index = await readFile(join(workspace.project, '.context/INDEX.md'), 'utf8')
    expect(index).toContain('example/first@0.1.0')
    expect(index).toContain('example/second@0.1.0')
    expect(index).toContain('1. **example/shared@0.1.0**')
    const config = await readConfig(workspace.project)
    await rm(join(workspace.project, '.context'), { recursive: true })
    unwrap(await installPacks({ project: workspace.project, config }))
    expect(await readFile(join(workspace.project, '.context/INDEX.md'), 'utf8')).toBe(index)
  })

  it('adds another preset without reinstalling or duplicating a shared component', async () => {
    const workspace = await createWorkspace()
    unwrap(
      await addPacks({ ...workspace, config: { output: '.context', packs: [] }, packs: ['first'] })
    )
    const note = join(workspace.project, '.context/docs/example/shared/0.1.0/notes.md')
    await writeFile(note, 'Personal notes')
    const lock = unwrap(
      await addPacks({
        ...workspace,
        config: await readConfig(workspace.project),
        packs: ['second'],
      })
    )
    expect(lock.packs).toHaveLength(3)
    expect(lock.presets).toHaveLength(2)
    expect(await readFile(note, 'utf8')).toBe('Personal notes')
  })

  it('rejects conflicting versions across presets before writing consumer files', async () => {
    const workspace = await createWorkspace()
    await writePreset({
      root: workspace.root,
      name: 'second',
      members: [{ name: 'shared', version: '2.0.0' }],
    })
    const result = await addPacks({
      ...workspace,
      config: { output: '.context', packs: [] },
      packs: ['first', 'second'],
    })
    expect(isErr(result) && result.error.kind).toBe('conflict')
    await expect(access(join(workspace.project, 'granary.config.json'))).rejects.toMatchObject({
      code: 'ENOENT',
    })
    await expect(access(join(workspace.project, '.context'))).rejects.toMatchObject({
      code: 'ENOENT',
    })
  })

  it('rejects a failed component retrieval without installing other members', async () => {
    const workspace = await createWorkspace()
    await rm(join(workspace.root, 'source/one/README.md'))
    const result = await addPacks({
      ...workspace,
      config: { output: '.context', packs: [] },
      packs: ['first'],
    })
    expect(isErr(result)).toBe(true)
    await expect(access(join(workspace.project, '.context'))).rejects.toMatchObject({
      code: 'ENOENT',
    })
  })

  it('rejects drifted local preset definitions before restoring members', async () => {
    const workspace = await createWorkspace()
    unwrap(
      await addPacks({ ...workspace, config: { output: '.context', packs: [] }, packs: ['first'] })
    )
    await rm(join(workspace.project, '.context'), { recursive: true })
    await writePreset({ root: workspace.root, name: 'first', members: [{ name: 'two' }] })
    const result = await installPacks({
      project: workspace.project,
      config: await readConfig(workspace.project),
    })
    expect(isErr(result) && result.error.kind).toBe('drift')
    await expect(access(join(workspace.project, '.context'))).rejects.toMatchObject({
      code: 'ENOENT',
    })
  })

  it('persists destination overrides on presets and their components', async () => {
    const workspace = await createWorkspace()
    const lock = unwrap(
      await addPacks({
        ...workspace,
        config: { output: '.context', packs: [] },
        packs: ['first'],
        output: 'reference',
      })
    )
    expect(lock.presets?.[0]?.request.output).toBe('reference')
    expect(lock.packs.every((pack) => pack.output === 'reference')).toBe(true)
    expect(await readFile(join(workspace.project, 'reference/INDEX.md'), 'utf8')).toContain(
      'example/first'
    )
  })

  it('rejects content overrides on presets and mismatched preset versions', async () => {
    const workspace = await createWorkspace()
    const params = { ...workspace, config: { output: '.context', packs: [] }, packs: ['first'] }
    expect(isErr(await addPacks({ ...params, content: ['docs'] }))).toBe(true)
    expect(isErr(await addPacks({ ...params, version: '9.0.0' }))).toBe(true)
  })

  it('rejects recursive, duplicate, and empty preset definitions', () => {
    const member = {
      name: 'example/shared',
      source: { kind: 'local', path: '.' },
      manifest: 'granary.json',
      version: '0.1.0',
      content: ['docs'],
    }
    const base = {
      name: 'example/recommended',
      version: '0.1.0',
      description: 'Rules',
      packs: [member],
    }
    expect(presetSchema.safeParse(base).success).toBe(true)
    expect(presetSchema.safeParse({ ...base, packs: [] }).success).toBe(false)
    expect(presetSchema.safeParse({ ...base, packs: [member, member] }).success).toBe(false)
    expect(
      presetSchema.safeParse({ ...base, packs: [{ ...member, manifest: 'granary.preset.json' }] })
        .success
    ).toBe(false)
    expect(
      presetSchema.safeParse({ ...base, packs: [{ ...member, name: base.name }] }).success
    ).toBe(false)
  })

  it('rejects lock membership that does not match expanded component requests', async () => {
    const workspace = await createWorkspace()
    const lock = unwrap(
      await addPacks({ ...workspace, config: { output: '.context', packs: [] }, packs: ['first'] })
    )
    expect(lockfileSchema.safeParse({ ...lock, packs: [] }).success).toBe(false)
  })

  it('rejects tampered member order even when every member still matches an installed pack', async () => {
    const workspace = await createWorkspace()
    const lock = unwrap(
      await addPacks({ ...workspace, config: { output: '.context', packs: [] }, packs: ['first'] })
    )
    const changed = {
      ...lock,
      presets: (lock.presets ?? []).map((preset) => ({
        ...preset,
        members: preset.members.toReversed(),
      })),
    }
    expect(lockfileSchema.safeParse(changed).success).toBe(true)
    await writeFile(join(workspace.project, 'granary-lock.json'), JSON.stringify(changed))
    await rm(join(workspace.project, '.context'), { recursive: true })
    const result = await installPacks({
      project: workspace.project,
      config: await readConfig(workspace.project),
    })
    expect(isErr(result) && result.error.kind).toBe('drift')
    await expect(access(join(workspace.project, '.context'))).rejects.toMatchObject({
      code: 'ENOENT',
    })
  })

  it('rejects indirect recursive metadata masquerading as a leaf manifest', async () => {
    const workspace = await createWorkspace()
    const nested = await readFile(
      join(workspace.root, 'source/presets/second/granary.preset.json'),
      'utf8'
    )
    const parsed: unknown = JSON.parse(nested)
    const preset = presetSchema.parse(parsed)
    await writeFile(
      join(workspace.root, 'source/one/granary.json'),
      JSON.stringify({ ...preset, name: 'example/one' })
    )
    const result = await addPacks({
      ...workspace,
      config: { output: '.context', packs: [] },
      packs: ['first'],
    })
    expect(isErr(result) && result.error.kind).toBe('invalid')
    await expect(access(join(workspace.project, '.context'))).rejects.toMatchObject({
      code: 'ENOENT',
    })
  })

  it('pins Git preset members to the definition commit and restores after the branch moves', async () => {
    const workspace = await createWorkspace()
    const repository = join(workspace.root, 'source')
    await execute('git', ['init', '--quiet', '--initial-branch=main', repository])
    await execute('git', ['-C', repository, 'add', '.'])
    const tree = await execute('git', ['-C', repository, 'write-tree'])
    const commit = await execute(
      'git',
      ['-C', repository, 'commit-tree', tree.stdout.trim(), '-m', 'Preset fixture'],
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
    await execute('git', ['-C', repository, 'update-ref', 'refs/heads/main', commit.stdout.trim()])
    const source = { kind: 'git', repository: pathToFileURL(repository).href, ref: 'main' } as const
    const lock = unwrap(
      await addPacks({
        project: workspace.project,
        source,
        config: { output: '.context', packs: [] },
        packs: ['first'],
      })
    )
    expect(lock.presets?.[0]?.definition.revision).toBe(commit.stdout.trim())
    expect(lock.packs.every((pack) => pack.definition.revision === commit.stdout.trim())).toBe(true)
    await writeFile(join(repository, 'shared/README.md'), 'New source bytes')
    await execute('git', ['-C', repository, 'add', '.'])
    const nextTree = await execute('git', ['-C', repository, 'write-tree'])
    const next = await execute(
      'git',
      [
        '-C',
        repository,
        'commit-tree',
        nextTree.stdout.trim(),
        '-p',
        commit.stdout.trim(),
        '-m',
        'Move branch',
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
    await execute('git', ['-C', repository, 'update-ref', 'refs/heads/main', next.stdout.trim()])
    await rm(join(workspace.project, '.context'), { recursive: true })
    unwrap(
      await installPacks({
        project: workspace.project,
        config: await readConfig(workspace.project),
      })
    )
    expect(
      await readFile(
        join(workspace.project, '.context/docs/example/shared/0.1.0/README.md'),
        'utf8'
      )
    ).toBe('shared reference\n')
  })
})

async function createWorkspace() {
  const root = await mkdtemp(join(tmpdir(), 'granary-preset-'))
  onTestFinished(() => rm(root, { recursive: true, force: true }))
  const project = join(root, 'project')
  await mkdir(project)
  await mapLimited({
    items: ['shared', 'one', 'two'],
    concurrency: 3,
    transform: async (name) => {
      const directory = join(root, 'source', name)
      await mkdir(directory, { recursive: true })
      await writeFile(join(directory, 'README.md'), `${name} reference\n`)
      await writeFile(
        join(directory, 'granary.json'),
        JSON.stringify({
          name: `example/${name}`,
          version: '0.1.0',
          description: 'Rules',
          entry: 'README.md',
          files: ['README.md'],
        })
      )
    },
  })
  await writePreset({ root, name: 'first', members: [{ name: 'shared' }, { name: 'one' }] })
  await writePreset({ root, name: 'second', members: [{ name: 'shared' }, { name: 'two' }] })
  return { root, project, source: { kind: 'local', path: '../source' } as const }
}

type WritePresetParams = {
  readonly root: string
  readonly name: string
  readonly members: readonly { readonly name: string; readonly version?: string }[]
}

async function writePreset({ root, name, members }: WritePresetParams) {
  const directory = join(root, 'source/presets', name)
  await mkdir(directory, { recursive: true })
  await writeFile(
    join(directory, 'granary.preset.json'),
    JSON.stringify({
      name: `example/${name}`,
      version: '0.1.0',
      description: 'Recommended rules',
      packs: members.map((member) => ({
        name: `example/${member.name}`,
        source: { kind: 'local', path: `../../${member.name}` },
        manifest: 'granary.json',
        version: member.version ?? '0.1.0',
        content: ['docs'],
      })),
    })
  )
}

async function readConfig(project: string) {
  const raw: unknown = JSON.parse(await readFile(join(project, 'granary.config.json'), 'utf8'))
  return projectConfigSchema.parse(raw)
}
