import { execFile } from 'node:child_process'
import { access, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { promisify } from 'node:util'

import { isErr, unwrap } from 'massaman/control'
import { describe, expect, it, onTestFinished } from 'vitest'

import { catalogSchema } from '../packs/catalog.js'
import { readCatalogProject } from '../project/catalog.js'
import { findPacks } from '../sources/manifests.js'
import { addPacks } from './add.js'
import { installPacks } from './install.js'

const leaf = {
  version: '0.1.0',
  description: 'Rules',
  path: 'reference/rules',
  entry: 'README.md',
  files: ['*.md'],
}
const catalog = {
  schemaVersion: 1,
  packs: {
    'example/rules': leaf,
    'example/recommended': {
      version: '0.1.0',
      description: 'Ordered rules',
      includes: ['example/rules@0.1.0'],
    },
  },
}
const execute = promisify(execFile)

describe('structured catalogs', { timeout: 15_000 }, () => {
  it('rejects empty documents, nested composites, missing members and competing leaf shapes', () => {
    expect(catalogSchema.safeParse(catalog).success).toBe(true)
    expect(catalogSchema.safeParse({ schemaVersion: 1 }).success).toBe(false)
    expect(
      catalogSchema.safeParse({
        schemaVersion: 1,
        dependencies: { 'example/rules': { source: 'file:.', version: '0.1.0' } },
      }).success
    ).toBe(true)
    expect(
      catalogSchema.safeParse({
        ...catalog,
        packs: {
          ...catalog.packs,
          'example/nested': {
            version: '0.1.0',
            description: 'Nested',
            includes: ['example/recommended@0.1.0'],
          },
        },
      }).success
    ).toBe(false)
    expect(
      catalogSchema.safeParse({
        ...catalog,
        packs: { 'example/rules': { ...leaf, includes: ['example/rules@0.1.0'] } },
      }).success
    ).toBe(false)
    expect(
      catalogSchema.safeParse({
        ...catalog,
        dependencies: { 'example/rules': { source: 'example/rules' } },
      }).success
    ).toBe(false)
  })

  it('discovers only declared packs and ignores the producer dependency destinations', async () => {
    const project = await workspace()
    await writeDocument(project, {
      ...catalog,
      dependencies: { 'example/unavailable': { source: 'file:missing' } },
      installDir: 'producer-only',
    })
    await mkdir(join(project, 'undeclared'))
    await writeFile(
      join(project, 'undeclared/granary.json'),
      JSON.stringify({
        name: 'example/undeclared',
        version: '0.1.0',
        description: 'Hidden',
        entry: 'README.md',
        files: ['*.md'],
      })
    )
    const available = unwrap(await findPacks({ project, source: { kind: 'local', path: '.' } }))
    expect(available.map((pack) => pack.name)).toEqual(['example/rules', 'example/recommended'])
    const consumer = await workspace()
    const lock = unwrap(
      await addPacks({
        project: consumer,
        source: { kind: 'local', path: project },
        packs: ['recommended'],
        config: { output: 'docs/reference', packs: [] },
      })
    )
    expect(lock.packs[0]?.output).toBe('docs/reference')
    expect(lock.packs[0]?.definitionHashKind).toBe('catalog-v1')
  })

  it('dogfoods a composite and restores after unrelated provider and dependency changes', async () => {
    const project = await workspace()
    await writeDocument(project, {
      ...catalog,
      dependencies: { 'example/recommended': { source: 'file:.', version: '0.1.0' } },
    })
    const lock = unwrap(
      await installPacks({ project, config: unwrap(await readCatalogProject({ project })) })
    )
    expect(lock.packs.map((pack) => pack.request.name)).toEqual(['example/rules'])
    expect(lock.presets?.[0]?.definitionHashKind).toBe('catalog-v1')
    const document = JSON.parse(await readFile(join(project, 'granary.json'), 'utf8'))
    expect(Object.keys(document.dependencies)).toEqual(['example/recommended'])
    await expect(access(join(project, 'granary.config.json'))).rejects.toMatchObject({
      code: 'ENOENT',
    })
    await writeDocument(project, {
      ...document,
      packs: {
        ...document.packs,
        'example/unrelated': { ...leaf, description: 'New unrelated declaration' },
      },
    })
    await rm(join(project, '.context'), { recursive: true })
    unwrap(await installPacks({ project, config: unwrap(await readCatalogProject({ project })) }))
    expect(
      await readFile(join(project, '.context/docs/example/rules/0.1.0/README.md'), 'utf8')
    ).toBe('# Rules\n')
  })

  it('updates only dependencies when adding a self-provided leaf and restores its scoped hash', async () => {
    const project = await workspace()
    await writeDocument(project, catalog)
    const config = unwrap(await readCatalogProject({ project }))
    unwrap(
      await addPacks({
        project,
        config,
        source: { kind: 'local', path: '.' },
        packs: ['rules'],
        output: 'docs/context',
      })
    )
    const document = JSON.parse(await readFile(join(project, 'granary.json'), 'utf8'))
    expect(document.packs).toEqual(catalog.packs)
    expect(document.dependencies['example/rules'].installDir).toBe('docs/context')
    await rm(join(project, 'docs/context'), { recursive: true })
    unwrap(await installPacks({ project, config: unwrap(await readCatalogProject({ project })) }))
  })

  it('rejects selected definition drift and edited installed files before restoration', async () => {
    const project = await workspace()
    const document = {
      ...catalog,
      dependencies: { 'example/recommended': { source: 'file:.', version: '0.1.0' } },
    }
    await writeDocument(project, document)
    unwrap(await installPacks({ project, config: unwrap(await readCatalogProject({ project })) }))
    await writeDocument(project, {
      ...document,
      packs: {
        ...catalog.packs,
        'example/rules': { ...leaf, description: 'Changed selected declaration' },
      },
    })
    const result = await installPacks({
      project,
      config: unwrap(await readCatalogProject({ project })),
    })
    expect(isErr(result) && result.error.kind).toBe('drift')
    await writeDocument(project, document)
    await writeFile(join(project, '.context/docs/example/rules/0.1.0/README.md'), 'Personal edits')
    expect(
      isErr(await installPacks({ project, config: unwrap(await readCatalogProject({ project })) }))
    ).toBe(true)
  })

  it('installs manifestless documentation separately from hidden ignored code and restores both', async () => {
    const source = await workspace()
    await mkdir(join(source, 'src'))
    await writeFile(join(source, 'src/index.ts'), 'export const answer = 42\n')
    const project = await workspace()
    await writeDocument(project, {
      schemaVersion: 1,
      installDir: 'docs/vendor',
      dependencies: {
        'example/plain': {
          source: `file:${source}`,
          selection: {
            docs: { path: 'reference/rules', entry: 'README.md', files: ['*.md'] },
            code: { path: 'src', entry: 'index.ts', files: ['*.ts'] },
          },
        },
      },
    })
    const lock = unwrap(
      await installPacks({ project, config: unwrap(await readCatalogProject({ project })) })
    )
    expect(lock.packs[0]?.definitionHashKind).toBe('selection-v1')
    expect(
      await readFile(join(project, 'docs/vendor/docs/example/plain/0.0.0/README.md'), 'utf8')
    ).toBe('# Rules\n')
    expect(
      await readFile(join(project, '.context/repos/example/plain/0.0.0/index.ts'), 'utf8')
    ).toContain('42')
    expect(await readFile(join(project, '.context/repos/.gitignore'), 'utf8')).toContain('*')
    await rm(join(project, 'docs/vendor'), { recursive: true })
    await rm(join(project, '.context'), { recursive: true })
    unwrap(await installPacks({ project, config: unwrap(await readCatalogProject({ project })) }))
    expect(
      await readFile(join(project, '.context/repos/example/plain/0.0.0/index.ts'), 'utf8')
    ).toContain('42')
  })

  it('rejects visible repository-code destinations and source/destination overlap', async () => {
    expect(catalogSchema.safeParse({ ...catalog, codeDir: 'vendor/code' }).success).toBe(false)
    const project = await workspace()
    await writeDocument(project, {
      ...catalog,
      dependencies: { 'example/rules': { source: 'file:.', installDir: 'reference' } },
    })
    const result = await installPacks({
      project,
      config: unwrap(await readCatalogProject({ project })),
    })
    expect(isErr(result) && result.error.kind).toBe('conflict')
    await expect(access(join(project, 'granary-lock.json'))).rejects.toMatchObject({
      code: 'ENOENT',
    })
  })

  it.each([
    { layout: 'inline', document: catalog },
    {
      layout: 'independent',
      document: {
        schemaVersion: 1,
        packs: {
          'example/recommended': {
            ...catalog.packs['example/recommended'],
            includes: [{ name: 'example/rules', source: 'file:reference/rules', version: '0.1.0' }],
          },
        },
      },
    },
  ])(
    'pins Git $layout catalog members and restores after the source branch moves',
    async ({ document }) => {
      const source = await workspace()
      await writeDocument(join(source, 'reference/rules'), {
        name: 'example/rules',
        version: leaf.version,
        description: leaf.description,
        entry: leaf.entry,
        files: leaf.files,
      })
      await writeDocument(source, document)
      await execute('git', ['-C', source, 'init'])
      await commitSource(source)
      const project = await workspace()
      await writeDocument(project, {
        schemaVersion: 1,
        dependencies: {
          'example/recommended': { source: `git+${pathToFileURL(source).href}`, version: '0.1.0' },
        },
      })
      const lock = unwrap(
        await installPacks({ project, config: unwrap(await readCatalogProject({ project })) })
      )
      const revision = lock.presets?.[0]?.definition.revision
      expect(lock.packs[0]?.definition.revision).toBe(revision)
      expect(lock.packs[0]?.groups[0]?.origin.revision).toBe(revision)
      await writeFile(join(source, 'reference/rules/README.md'), '# Branch moved\n')
      await commitSource(source)
      await rm(join(project, '.context'), { recursive: true })
      unwrap(await installPacks({ project, config: unwrap(await readCatalogProject({ project })) }))
      expect(
        await readFile(join(project, '.context/docs/example/rules/0.1.0/README.md'), 'utf8')
      ).toBe('# Rules\n')
    }
  )

  it('pins manifestless Git files and verifies reference-code Git exclusion', async () => {
    const source = await workspace()
    await execute('git', ['-C', source, 'init'])
    await commitSource(source)
    const project = await workspace()
    await execute('git', ['-C', project, 'init'])
    await writeDocument(project, {
      schemaVersion: 1,
      installDir: 'docs',
      dependencies: {
        'example/plain': {
          source: `git+${pathToFileURL(source).href}`,
          selection: { code: { path: 'reference/rules', entry: 'README.md', files: ['*.md'] } },
        },
      },
    })
    const lock = unwrap(
      await installPacks({ project, config: unwrap(await readCatalogProject({ project })) })
    )
    const version = lock.packs[0]?.version
    const destination = `.context/repos/example/plain/${version}/README.md`
    const ignored = await execute('git', ['-C', project, 'check-ignore', destination])
    expect(ignored.stdout.trim()).toBe(destination)
    await writeFile(join(source, 'reference/rules/README.md'), '# Moved\n')
    await commitSource(source)
    await rm(join(project, '.context'), { recursive: true })
    unwrap(await installPacks({ project, config: unwrap(await readCatalogProject({ project })) }))
    expect(await readFile(join(project, destination), 'utf8')).toBe('# Rules\n')
  })

  it('restores both formatter-stable and legacy generated index links', async () => {
    const project = await workspace()
    await writeDocument(project, {
      ...catalog,
      dependencies: { 'example/recommended': { source: 'file:.', version: '0.1.0' } },
    })
    unwrap(await installPacks({ project, config: unwrap(await readCatalogProject({ project })) }))
    const path = join(project, '.context/INDEX.md')
    const current = await readFile(path, 'utf8')
    const legacy = current.replace(/\]\(([^\s<>()[\]]+)\)/g, '](<$1>)')
    expect(legacy).not.toBe(current)
    await writeFile(path, legacy)
    unwrap(await installPacks({ project, config: unwrap(await readCatalogProject({ project })) }))
    expect(await readFile(path, 'utf8')).toBe(current)
  })
})

async function workspace(): Promise<string> {
  const project = await mkdtemp(join(tmpdir(), 'granary-catalog-'))
  onTestFinished(() => rm(project, { recursive: true, force: true }))
  await mkdir(join(project, 'reference/rules'), { recursive: true })
  await writeFile(join(project, 'reference/rules/README.md'), '# Rules\n')
  return project
}

async function writeDocument(project: string, document: unknown): Promise<void> {
  await writeFile(join(project, 'granary.json'), JSON.stringify(document, null, 2))
}

async function commitSource(source: string): Promise<void> {
  await execute('git', ['-C', source, 'add', '.'])
  await execute('git', [
    '-C',
    source,
    '-c',
    'user.name=Granary Test',
    '-c',
    'user.email=test@example.com',
    'commit',
    '-m',
    'test: record source',
  ])
}
