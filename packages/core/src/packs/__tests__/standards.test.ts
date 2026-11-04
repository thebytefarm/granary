import { access, cp, glob, mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, isAbsolute, join, relative, resolve as absolutePath, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

import { expectSuccess as unwrap } from '#/__tests__/support.ts'
import { describe, expect, it, onTestFinished } from 'vitest'

import { mapLimited } from '#/map-limited.ts'
import { createGranary } from '#/client.ts'
import { buildContentDestination } from '#/content/destination.ts'
import { manifestSchema } from '#/manifests/schema.ts'
import type { LockedPack } from '#/locks/schema.ts'
import { resolveWorkspaceConfig } from '#/workspace/read.ts'
import { installPacks } from '#/packs/install.ts'

const standards = fileURLToPath(new URL('../../../../../', import.meta.url))

describe('installed engineering standards', { timeout: 15_000 }, () => {
  it('installs every selected page with its local Markdown links', async () => {
    const project = await mkdtemp(join(tmpdir(), 'granary-standards-'))
    onTestFinished(() => rm(project, { recursive: true, force: true }))
    const source = fileURLToPath(
      new URL('../../../../plugins/src/standards/__fixtures__/linked-docs/', import.meta.url)
    )
    const lock = unwrap(
      await createGranary({ project }).packs.add({
        source: { provider: 'local', path: source },
        output: 'reference',
      })
    )
    const pack = lock.packs[0]
    expect(pack).toBeDefined()
    if (!pack) {
      return
    }
    const destination = join(project, 'reference')
    const raw: unknown = JSON.parse(await readFile(join(source, 'granary.json'), 'utf8'))
    const manifest = manifestSchema.parse(raw)
    const paths = await Array.fromAsync(glob([...(manifest.files?.include ?? [])], { cwd: source }))
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
    expect(await readFile(join(project, 'AGENTS.md'), 'utf8')).toContain(
      '[reference/README.md](reference/README.md)'
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
      const document = manifestSchema.parse(
        JSON.parse(await readFile(join(source, 'granary.json'), 'utf8'))
      )
      expect(document.name).toBe(name)
      const lock = unwrap(
        await createGranary({ project }).packs.add({
          source: { provider: 'local', path: source },
          output: 'reference',
        })
      )
      expect(lock.packs).toHaveLength(1)
      await mapLimited({
        items: lock.packs,
        concurrency: 2,
        transform: (pack) => checkComponentLinks({ project, pack }),
      })
      await rm(join(project, 'reference'), { recursive: true })
      unwrap(await createGranary({ project }).packs.install())
      expect(await readFile(join(project, 'reference/README.md'), 'utf8')).toContain('# ')
    }
  )

  it.each(['typescript', 'rust', 'python'])(
    'installs the recommended %s set with self-contained component links',
    async (language) => {
      const project = await createConsumer()
      const lock = unwrap(
        await createGranary({ project }).packs.add({
          source: {
            provider: 'local',
            path: join(standards, 'packs'),
            pack: `recommended-${language}`,
          },
          output: 'reference',
        })
      )
      expect(lock.packs).toHaveLength(5)
      expect(lock.packs.map((pack) => pack.request.label)).toEqual([
        'file:./engineering',
        'file:./git',
        'file:./documentation',
        'file:./agent-instructions',
        `file:./${language}`,
      ])
      await mapLimited({
        items: lock.packs,
        concurrency: 2,
        transform: (pack) => checkComponentLinks({ project, pack }),
      })
      await rm(join(project, 'reference'), { recursive: true })
      unwrap(await createGranary({ project }).packs.install())
      expect(
        await readFile(join(project, `reference/${language}-functional/0.1.0/README.md`), 'utf8')
      ).toContain('# ')
    }
  )

  it('installs all three recommended sets as seven unique components', async () => {
    const project = await createConsumer()
    const config = unwrap(
      await resolveWorkspaceConfig({
        project,
        document: {
          name: 'polyglot',
          packs: Object.fromEntries(
            ['typescript', 'rust', 'python'].map((language) => [
              `file:${join(standards, 'packs')}#recommended-${language}`,
              { output: 'reference' },
            ])
          ),
        },
      })
    )
    const lock = unwrap(await installPacks({ project, config }))
    expect(lock.packs).toHaveLength(7)
    expect(
      lock.composition?.definitions.filter((definition) => definition.id.includes('#recommended-'))
    ).toHaveLength(3)
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
  const destination = join(
    project,
    buildContentDestination({ pack, group: { name: 'docs' }, path: '.' })
  )
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
