import { access, cp, glob, mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, isAbsolute, join, relative, resolve as absolutePath, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

import { unwrap } from 'massaman/control'
import { describe, expect, it, onTestFinished } from 'vitest'

import { mapLimited } from '../map-limited.js'
import { packManifestSchema } from '../packs/manifest.js'
import type { LockedPack } from '../project/lock.js'
import { projectConfigSchema } from '../project/config.js'
import { addPacks } from './add.js'
import { installPacks } from './install.js'

const standards = fileURLToPath(new URL('../../../../', import.meta.url))

describe('installed engineering standards', { timeout: 15_000 }, () => {
  it('installs a legacy bundle with every selected page and its local Markdown links', async () => {
    const project = await mkdtemp(join(tmpdir(), 'granary-standards-'))
    onTestFinished(() => rm(project, { recursive: true, force: true }))
    const source = fileURLToPath(new URL('./fixtures/legacy-bundle/', import.meta.url))
    const lock = unwrap(
      await addPacks({
        project,
        config: { output: '.context', packs: [] },
        source: { kind: 'local', path: source },
      })
    )
    const pack = lock.packs[0]
    expect(pack).toBeDefined()
    if (!pack) {
      return
    }
    const destination = join(project, '.context/docs', pack.request.name, pack.version)
    const raw: unknown = JSON.parse(await readFile(join(source, 'granary.json'), 'utf8'))
    const manifest = packManifestSchema.parse(raw)
    const paths = await Array.fromAsync(glob([...manifest.files], { cwd: source }))
    expect(pack.groups[0]?.files.map((file) => file.path).toSorted()).toEqual(paths.toSorted())
    await mapLimited({
      items: paths,
      concurrency: 4,
      transform: async (path) => {
        const installed = await readFile(join(destination, path), 'utf8')
        expect(installed).toBe(await readFile(join(source, path), 'utf8'))
        const links = [...installed.matchAll(/\[[^\]]*\]\(([^\s)]+)\)/g)]
          .flatMap((match) => match[1]?.split('#')[0] || [])
          .filter((target) => !/^[a-z][a-z0-9+.-]*:/i.test(target))
        await mapLimited({
          items: links,
          concurrency: 4,
          transform: async (target) => {
            const absolute = absolutePath(dirname(join(destination, path)), target)
            const suffix = relative(destination, absolute)
            expect(isAbsolute(suffix) || suffix === '..' || suffix.startsWith(`..${sep}`)).toBe(
              false
            )
            await expect(access(absolute)).resolves.toBeUndefined()
          },
        })
      },
    })
    expect(await readFile(join(project, '.context/INDEX.md'), 'utf8')).toContain(
      `docs/${pack.request.name}/${pack.version}/README.md`
    )
  })

  it.each([
    { directory: 'engineering', name: 'bytefarm/engineering' },
    { directory: 'git', name: 'bytefarm/git' },
    { directory: 'documentation', name: 'bytefarm/documentation' },
    { directory: 'agent-instructions', name: 'bytefarm/agent-instructions' },
    { directory: 'typescript', name: 'bytefarm/typescript-functional' },
    { directory: 'rust', name: 'bytefarm/rust-functional' },
    { directory: 'python', name: 'bytefarm/python-functional' },
  ])(
    'installs and restores $name from an independently copied directory',
    async ({ directory, name }) => {
      const source = await createConsumer()
      const project = await createConsumer()
      await cp(join(standards, 'packs', directory), source, { recursive: true })
      const document = packManifestSchema.parse(
        JSON.parse(await readFile(join(source, 'granary.json'), 'utf8'))
      )
      expect(document.name).toBe(name)
      const lock = unwrap(
        await addPacks({
          project,
          config: { output: '.context', packs: [] },
          source: { kind: 'local', path: source },
        })
      )
      expect(lock.packs.map((pack) => pack.request.name)).toEqual([name])
      expect(lock.presets ?? []).toEqual([])
      await mapLimited({
        items: lock.packs,
        concurrency: 2,
        transform: (pack) => checkComponentLinks({ project, pack }),
      })
      const config = projectConfigSchema.parse(
        JSON.parse(await readFile(join(project, 'granary.config.json'), 'utf8'))
      )
      await rm(join(project, '.context'), { recursive: true })
      unwrap(await installPacks({ project, config }))
      expect(await readFile(join(project, '.context/INDEX.md'), 'utf8')).toContain(name)
    }
  )

  it.each(['typescript', 'rust', 'python'])(
    'installs the recommended %s set with self-contained component links',
    async (language) => {
      const project = await createConsumer()
      const lock = unwrap(
        await addPacks({
          project,
          config: { output: '.context', packs: [] },
          source: { kind: 'local', path: standards },
          packs: [`recommended-${language}`],
        })
      )
      expect(lock.packs).toHaveLength(5)
      expect(lock.presets?.[0]?.members.map((member) => member.name)).toEqual([
        'bytefarm/engineering',
        'bytefarm/git',
        'bytefarm/documentation',
        'bytefarm/agent-instructions',
        `bytefarm/${language}-functional`,
      ])
      await mapLimited({
        items: lock.packs,
        concurrency: 2,
        transform: (pack) => checkComponentLinks({ project, pack }),
      })
      const raw: unknown = JSON.parse(await readFile(join(project, 'granary.config.json'), 'utf8'))
      const config = projectConfigSchema.parse(raw)
      await rm(join(project, '.context'), { recursive: true })
      unwrap(await installPacks({ project, config }))
      expect(await readFile(join(project, '.context/INDEX.md'), 'utf8')).toContain(
        `recommended-${language}@0.1.0`
      )
    }
  )

  it('installs all three recommended sets as seven unique components', async () => {
    const project = await createConsumer()
    const lock = unwrap(
      await addPacks({
        project,
        config: { output: '.context', packs: [] },
        source: { kind: 'local', path: standards },
        packs: ['recommended-typescript', 'recommended-rust', 'recommended-python'],
      })
    )
    expect(lock.packs).toHaveLength(7)
    expect(lock.presets).toHaveLength(3)
    await mapLimited({
      items: lock.packs,
      concurrency: 2,
      transform: (pack) => checkComponentLinks({ project, pack }),
    })
  })
})

async function createConsumer() {
  const project = await mkdtemp(join(tmpdir(), 'granary-components-'))
  onTestFinished(() => rm(project, { recursive: true, force: true }))
  return project
}

type CheckComponentLinksParams = { readonly project: string; readonly pack: LockedPack }

async function checkComponentLinks({ project, pack }: CheckComponentLinksParams) {
  const destination = join(project, pack.output, 'docs', pack.request.name, pack.version)
  const files = pack.groups.flatMap((group) => group.files)
  await mapLimited({
    items: files,
    concurrency: 4,
    transform: async (file) => {
      const page = await readFile(join(destination, file.path), 'utf8')
      const links = [...page.matchAll(/\[[^\]]*\]\(([^\s)]+)\)/g)]
        .flatMap((match) => match[1]?.split('#')[0] || [])
        .filter((target) => !/^[a-z][a-z0-9+.-]*:/i.test(target))
      await mapLimited({
        items: links,
        concurrency: 4,
        transform: async (target) => {
          const absolute = absolutePath(dirname(join(destination, file.path)), target)
          const suffix = relative(destination, absolute)
          expect(isAbsolute(suffix) || suffix === '..' || suffix.startsWith(`..${sep}`)).toBe(false)
          await expect(access(absolute)).resolves.toBeUndefined()
        },
      })
    },
  })
}
