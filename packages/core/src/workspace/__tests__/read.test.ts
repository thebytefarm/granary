import { execFile } from 'node:child_process'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'

import { isErr, unwrap } from 'massaman/control'
import { describe, expect, it, onTestFinished } from 'vitest'

import { manifestSchema } from '#/manifests/schema.ts'
import { readWorkspaceConfig, resolveWorkspaceConfig } from '#/workspace/read.ts'
import { buildContentDestination } from '#/content/destination.ts'
import { installPacks } from '#/packs/install.ts'
import { applyUpdate, prepareUpdate } from '#/updates/review.ts'

const execute = promisify(execFile)

describe('workspace pack manifests', { timeout: 20_000 }, () => {
  it('validates root and nested selection while rejecting competing revision selectors', () => {
    expect(
      manifestSchema.safeParse({
        name: 'app',
        output: 'docs',
        packs: {
          'github:vercel/next.js': [
            'v15',
            { tag: 'v16', files: { include: ['docs/**'], exclude: ['**/*.png'] } },
          ],
        },
      }).success
    ).toBe(true)
    expect(
      manifestSchema.safeParse({
        name: 'app',
        packs: { 'github:vercel/next.js': { tag: 'v16', branch: 'main' } },
      }).success
    ).toBe(false)
    expect(
      manifestSchema.safeParse({ name: 'app', files: { include: ['../secret'] } }).success
    ).toBe(false)
    expect(manifestSchema.safeParse({ name: 'app', files: ['*.md'] }).success).toBe(false)
  })

  it('installs filtered arbitrary repositories without an upstream manifest and restores the locked revision', async () => {
    const repository = await workspace()
    await mkdir(join(repository, 'docs'))
    await mkdir(join(repository, 'examples'))
    await writeFile(join(repository, 'docs/api.mdx'), '# API v1\n')
    await writeFile(join(repository, 'examples/hello.ts'), 'export const greeting = "hello"\n')
    await writeFile(join(repository, 'docs/private.txt'), 'exclude\n')
    await git({ directory: repository, args: ['init', '-b', 'main'] })
    await commit(repository)
    const project = await workspace()
    const key = `git+${pathToFileURL(repository).href}`
    await writeDocument({
      project,
      document: {
        name: 'consumer',
        output: 'reference',
        packs: {
          [key]: {
            branch: 'main',
            files: { include: ['docs/**', 'examples/**'], exclude: ['**/*.txt'] },
            output: 'next',
          },
        },
      },
    })
    const config = unwrap(await readWorkspaceConfig({ project }))
    const lock = unwrap(await installPacks({ project, config }))
    const pack = lock.packs[0]
    expect(pack?.groups[0]?.files.map((file) => file.path)).toEqual([
      'docs/api.mdx',
      'examples/hello.ts',
    ])
    expect(await readFile(join(project, 'reference/next/docs/api.mdx'), 'utf8')).toBe('# API v1\n')
    await writeFile(join(repository, 'docs/api.mdx'), '# API v2\n')
    await commit(repository)
    await rm(join(project, 'reference/next/docs/api.mdx'))
    const restored = unwrap(
      await installPacks({ project, config: unwrap(await readWorkspaceConfig({ project })) })
    )
    expect(restored.packs[0]?.definition.revision).toBe(pack?.definition.revision)
    expect(await readFile(join(project, 'reference/next/docs/api.mdx'), 'utf8')).toBe('# API v1\n')
  })

  it('includes declared child packs but not a named pack sibling or an undisclosed nested manifest', async () => {
    const source = await workspace()
    await mkdir(join(source, 'rules'))
    await mkdir(join(source, 'hidden'))
    await writeFile(join(source, 'rules/main.md'), '# Rules\n')
    await writeFile(join(source, 'rules/testing.md'), '# Testing\n')
    await writeDocument({
      project: source,
      document: {
        name: 'standards',
        packs: {
          engineering: {
            files: { include: ['rules/main.md'] },
            packs: { examples: { files: { include: ['rules/testing.md'] } } },
          },
          other: { files: { include: ['hidden/**'] } },
        },
      },
    })
    await writeDocument({
      project: join(source, 'hidden'),
      document: { name: 'hidden', files: { include: ['*.md'] } },
    })
    const project = await workspace()
    const config = unwrap(
      await resolveWorkspaceConfig({
        project,
        document: { name: 'app', packs: { [`file:${source}#engineering`]: { output: 'adopted' } } },
      })
    )
    expect(config.packs.map((pack) => pack.label)).toEqual([
      `file:${source}#engineering`,
      'examples',
    ])
    const lock = unwrap(await installPacks({ project, config }))
    expect(lock.packs).toHaveLength(2)
    expect(
      lock.packs.flatMap((pack) =>
        pack.groups.flatMap((group) => group.files.map((file) => file.path))
      )
    ).not.toContain('hidden/granary.json')
  })

  it('rejects cycles and fails before writing when installations share a destination', async () => {
    const project = await workspace()
    const cycle = await resolveWorkspaceConfig({
      project,
      document: {
        name: 'app',
        packs: { first: { source: '#second' }, second: { source: '#first' } },
      },
    })
    expect(isErr(cycle)).toBe(true)
    const source = await workspace()
    await writeFile(join(source, 'README.md'), '# Rules\n')
    await writeFile(join(source, 'other.md'), '# Other\n')
    const conflict = await resolveWorkspaceConfig({
      project,
      document: {
        name: 'app',
        packs: {
          one: { source: `file:${source}`, files: { include: ['README.md'] }, output: 'same' },
          two: { source: `file:${source}`, files: { include: ['other.md'] }, output: 'same' },
        },
      },
    })
    expect(isErr(conflict)).toBe(true)
  })

  it('keeps two revisions of the same repository independent', async () => {
    const repository = await workspace()
    await writeFile(join(repository, 'README.md'), '# v1\n')
    await git({ directory: repository, args: ['init', '-b', 'main'] })
    await commit(repository)
    await git({ directory: repository, args: ['tag', 'v1'] })
    await writeFile(join(repository, 'README.md'), '# v2\n')
    await commit(repository)
    await git({ directory: repository, args: ['tag', 'v2'] })
    const project = await workspace()
    const config = unwrap(
      await resolveWorkspaceConfig({
        project,
        document: {
          name: 'app',
          packs: { [`git+${pathToFileURL(repository).href}`]: ['v1', { tag: 'v2' }] },
        },
      })
    )
    const lock = unwrap(await installPacks({ project, config }))
    expect(lock.packs).toHaveLength(2)
    expect(lock.packs[0]?.request.name).not.toBe(lock.packs[1]?.request.name)
    const content = await Promise.all(
      lock.packs.flatMap((pack) =>
        pack.groups.map((group) =>
          readFile(
            join(project, buildContentDestination({ pack, group, path: 'README.md' })),
            'utf8'
          )
        )
      )
    )
    expect(content).toEqual(['# v1\n', '# v2\n'])
  })

  it('reviews upstream changes and restores accepted consumer customizations separately', async () => {
    const source = await workspace()
    await writeFile(join(source, 'README.md'), '# Original\n')
    const project = await workspace()
    await writeDocument({
      project,
      document: { name: 'app', packs: { [`file:${source}`]: { output: 'adopted' } } },
    })
    unwrap(await installPacks({ project, config: unwrap(await readWorkspaceConfig({ project })) }))
    await writeFile(join(project, 'adopted/README.md'), '# Consumer edit\n')
    await writeFile(join(source, 'README.md'), '# Upstream edit\n')
    const config = unwrap(await readWorkspaceConfig({ project }))
    const review = unwrap(await prepareUpdate({ project, config }))
    expect(review.packs[0]?.files[0]?.kind).toBe('conflict')
    const accepted = {
      ...review,
      packs: review.packs.map((pack) => ({
        ...pack,
        files: pack.files.map((file) => ({ ...file, decision: 'local' as const })),
      })),
    }
    const updated = unwrap(await applyUpdate({ project, config, review: accepted }))
    expect(updated.packs[0]?.customizations).toHaveLength(1)
    expect(await readFile(join(project, 'adopted/README.md'), 'utf8')).toBe('# Consumer edit\n')
    await rm(join(project, 'adopted/README.md'))
    unwrap(await installPacks({ project, config: unwrap(await readWorkspaceConfig({ project })) }))
    expect(await readFile(join(project, 'adopted/README.md'), 'utf8')).toBe('# Consumer edit\n')
  })

  it('reviews edited consumer selections and rejects them during ordinary locked restoration', async () => {
    const source = await workspace()
    await writeFile(join(source, 'README.md'), '# Rules\n')
    await writeFile(join(source, 'example.ts'), 'export const example = true\n')
    const project = await workspace()
    const key = `file:${source}`
    await writeDocument({
      project,
      document: {
        name: 'app',
        packs: { [key]: { output: 'adopted', files: { include: ['README.md'] } } },
      },
    })
    unwrap(await installPacks({ project, config: unwrap(await readWorkspaceConfig({ project })) }))
    await writeDocument({
      project,
      document: {
        name: 'app',
        packs: { [key]: { output: 'adopted', files: { include: ['README.md', '*.ts'] } } },
      },
    })
    expect(isErr(await readWorkspaceConfig({ project }))).toBe(true)
    const config = unwrap(await readWorkspaceConfig({ project, allowChanges: true }))
    const review = unwrap(await prepareUpdate({ project, config }))
    unwrap(await applyUpdate({ project, config, review }))
    expect(await readFile(join(project, 'adopted/example.ts'), 'utf8')).toContain('example')
    expect(isErr(await readWorkspaceConfig({ project }))).toBe(false)
  })

  it('selects the shipped recommended set through the source-keyed API', async () => {
    const source = fileURLToPath(new URL('../../../../../packs/', import.meta.url))
    const project = await workspace()
    const config = unwrap(
      await resolveWorkspaceConfig({
        project,
        document: {
          name: 'app',
          packs: { [`file:${source}#recommended-typescript`]: { output: 'standards' } },
        },
      })
    )
    expect(config.packs).toHaveLength(5)
    const lock = unwrap(await installPacks({ project, config }))
    expect(lock.packs).toHaveLength(5)
    expect(
      lock.packs.flatMap((pack) =>
        pack.groups.flatMap((group) => Object.values(group.documents ?? {}))
      )
    ).toContain('standards')
  })

  it('uses only TypeScript and shared standards in Granary itself', async () => {
    const project = fileURLToPath(new URL('../../../../../', import.meta.url))
    const document = manifestSchema.parse(
      JSON.parse(await readFile(join(project, 'granary.json'), 'utf8'))
    )
    expect(Object.keys(document.packs ?? {})).toEqual(['file:packs#recommended-typescript'])
    const config = unwrap(await resolveWorkspaceConfig({ project, document }))
    expect(config.packs.map((pack) => pack.destination)).toEqual([
      '.context/docs/bytefarm/engineering/0.1.0',
      '.context/docs/bytefarm/git/0.1.0',
      '.context/docs/bytefarm/documentation/0.1.0',
      '.context/docs/bytefarm/agent-instructions/0.1.0',
      '.context/docs/bytefarm/typescript-functional/0.1.0',
    ])
  })
})

async function workspace(): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), 'granary-workspace-test-'))
  onTestFinished(() => rm(directory, { recursive: true, force: true }))
  return directory
}

async function writeDocument({
  project,
  document,
}: {
  readonly project: string
  readonly document: unknown
}): Promise<void> {
  await writeFile(join(project, 'granary.json'), JSON.stringify(document))
}

async function git({
  directory,
  args,
}: {
  readonly directory: string
  readonly args: readonly string[]
}): Promise<void> {
  await execute('git', ['-C', directory, ...args])
}

async function commit(directory: string): Promise<void> {
  await git({ directory, args: ['add', '.'] })
  await git({
    directory,
    args: [
      '-c',
      'user.name=Granary Test',
      '-c',
      'user.email=test@example.com',
      'commit',
      '--quiet',
      '-m',
      'fixture',
    ],
  })
}
