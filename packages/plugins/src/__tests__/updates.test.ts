import { cp, mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { isErr } from 'massaman/control'
import { expectSuccess as unwrap } from '#/__tests__/support.ts'
import { describe, expect, it, onTestFinished } from 'vitest'

import { createGranary } from '@granary/core'
import { readWorkspaceConfig } from '@granary/core/workspace'
import { installPacks } from '@granary/core/packs'
import { applyUpdate as applyCoreUpdate, prepareUpdate } from '@granary/core/updates'
import { standardsPlugin } from '#/standards/plugin.ts'
import { createStandardsClient } from '#/standards/client.ts'

const fixture = fileURLToPath(new URL('../standards/__fixtures__/standards-pack/', import.meta.url))

async function applyUpdate(options: Parameters<typeof applyCoreUpdate>[0]) {
  const plugin = standardsPlugin()
  return applyCoreUpdate({
    ...options,
    validators: [
      async (update) => {
        if (!plugin.validateUpdate) return { ok: true, value: undefined, error: null }
        return plugin.validateUpdate(update)
      },
    ],
  })
}

describe('reviewed updates', { timeout: 20_000 }, () => {
  it('rejects an update that removes a configured rule identity before changing files', async () => {
    const { project, source, directory } = await setup()
    const document = JSON.parse(await readFile(join(project, 'granary.json'), 'utf8'))
    const standard = unwrap(await createStandardsClient({ project }).toJSON()).standards[0]
    const qualifiedId = standard?.rules.find((rule) => rule.id === 'return-new-values')?.qualifiedId
    expect(qualifiedId).toBeDefined()
    await writeFile(
      join(project, 'granary.json'),
      JSON.stringify({
        ...document,
        plugins: {
          standards: {
            rules: {
              [qualifiedId ?? 'missing-rule']: { markers: ['[review]'] },
            },
          },
        },
      })
    )
    const upstream = join(source, 'immutability.md')
    await writeFile(
      upstream,
      (await readFile(upstream, 'utf8')).replace(
        'id="return-new-values"',
        'id="return-fresh-values"'
      )
    )
    const config = await readWorkspaceConfig({ project, allowChanges: true })
    if (isErr(config)) {
      expect(config.error).toBeNull()
      return
    }
    const prepared = await prepareUpdate({
      project,
      config: config.value,
    })
    if (isErr(prepared)) {
      expect(prepared.error).toBeNull()
      return
    }
    const before = await readFile(join(project, 'granary-lock.json'), 'utf8')
    const result = await applyUpdate({ project, config: config.value, review: prepared.value })
    expect(isErr(result)).toBe(true)
    if (isErr(result)) {
      expect(result.error.message).toContain('Update removes configured rule identities')
    }
    expect(await readFile(join(project, 'granary-lock.json'), 'utf8')).toBe(before)
    expect(await readFile(join(directory, 'immutability.md'), 'utf8')).toContain(
      'id="return-new-values"'
    )
  })

  it('updates an installed composite and its pinned members together while preserving enforcement settings', async () => {
    const project = await mkdtemp(join(tmpdir(), 'granary-preset-update-'))
    onTestFinished(() => rm(project, { recursive: true, force: true }))
    const source = join(project, 'source')
    const repository = fileURLToPath(new URL('../../../../', import.meta.url))
    await mkdir(source)
    await cp(join(repository, 'packs'), join(source, 'packs'), { recursive: true })
    await writeFile(
      join(source, 'granary.json'),
      JSON.stringify({
        name: 'bytefarm',
        packs: {
          'bytefarm/recommended-typescript': {
            files: { include: [] },
            packs: Object.fromEntries(
              ['engineering', 'git', 'documentation', 'agent-instructions', 'typescript'].map(
                (component) => [component, { source: `file:packs/${component}` }]
              )
            ),
          },
        },
      })
    )
    const standards = { default: '[review]', rules: {} }
    await writeFile(
      join(project, 'granary.json'),
      JSON.stringify({
        name: 'consumer',
        packs: {
          [`file:${source}#recommended-typescript`]: {},
        },
        plugins: { standards },
      })
    )
    const initial = await readWorkspaceConfig({ project })
    if (isErr(initial)) {
      expect(initial.error).toBeNull()
      return
    }
    expect((await installPacks({ project, config: initial.value })).error).toBeNull()
    const path = join(source, 'packs/typescript/README.md')
    await writeFile(path, `${await readFile(path, 'utf8')}\nAdditional reading context.\n`)
    const catalog = JSON.parse(await readFile(join(source, 'granary.json'), 'utf8'))
    await writeFile(
      join(source, 'granary.json'),
      JSON.stringify({
        ...catalog,
        packs: {
          ...catalog.packs,
          'bytefarm/recommended-typescript': {
            ...catalog.packs['bytefarm/recommended-typescript'],
            version: '0.1.1',
          },
        },
      })
    )
    const config = await readWorkspaceConfig({ project })
    if (isErr(config)) {
      expect(config.error).toBeNull()
      return
    }
    const prepared = await prepareUpdate({
      project,
      config: config.value,
    })
    expect(prepared.error).toBeNull()
    if (isErr(prepared)) {
      return
    }
    expect(prepared.value.packs).toHaveLength(5)
    const applied = await applyUpdate({ project, config: config.value, review: prepared.value })
    expect(applied.error).toBeNull()
    if (isErr(applied)) {
      return
    }
    expect(applied.value.packs).toHaveLength(5)
    expect(applied.value.composition?.definitions.length).toBeGreaterThanOrEqual(5)
    expect(JSON.parse(await readFile(join(project, 'granary.json'), 'utf8')).packs).toHaveProperty(
      `file:${source}#recommended-typescript`
    )
    expect(
      JSON.parse(await readFile(join(project, 'granary.json'), 'utf8')).plugins.standards
    ).toEqual(standards)
    const restored = await readWorkspaceConfig({ project })
    expect(restored.error).toBeNull()
    if (!isErr(restored)) {
      expect((await installPacks({ project, config: restored.value })).error).toBeNull()
    }
  })

  it('applies reviewed conflicts and restores materialized customizations without rewriting upstream hashes', async () => {
    const { project, source, directory } = await setup()
    const path = join(directory, 'immutability.md')
    const original = await readFile(path, 'utf8')
    const local = original.replace('function arguments.', 'function arguments or project state.')
    const incoming = original.replace(
      'function arguments.',
      'function arguments or retained values.'
    )
    await writeFile(path, local)
    await writeFile(join(source, 'immutability.md'), incoming)
    const config = await readWorkspaceConfig({ project })
    expect(config.error).toBeNull()
    if (isErr(config)) {
      return
    }
    const prepared = await prepareUpdate({
      project,
      config: config.value,
    })
    expect(prepared.error).toBeNull()
    if (isErr(prepared)) {
      return
    }
    expect(
      prepared.value.packs[0]?.files.find((file) => file.path === 'docs/immutability.md')?.decision
    ).toBe('defer')
    const refused = await applyUpdate({ project, config: config.value, review: prepared.value })
    expect(isErr(refused)).toBe(true)
    const merged = original.replace(
      'function arguments.',
      'function arguments, retained values, or project state.'
    )
    const review = {
      ...prepared.value,
      packs: prepared.value.packs.map((pack) => ({
        ...pack,
        files: pack.files.map((file) => {
          if (file.path === 'docs/immutability.md') {
            return { ...file, decision: 'merge' as const, merged }
          }
          return file
        }),
      })),
    }
    const result = await applyUpdate({ project, config: config.value, review })
    expect(result.error).toBeNull()
    if (isErr(result)) {
      return
    }
    expect(await readFile(path, 'utf8')).toBe(merged)
    const custom = result.value.packs[0]?.customizations?.[0]
    expect(custom?.path).toBe('immutability.md')
    expect(custom?.hash).not.toBe(
      result.value.packs[0]?.groups[0]?.files.find((file) => file.path === 'immutability.md')?.hash
    )
    await rm(path)
    const nextConfig = await readWorkspaceConfig({ project })
    expect(nextConfig.error).toBeNull()
    if (isErr(nextConfig)) {
      return
    }
    expect((await installPacks({ project, config: nextConfig.value })).error).toBeNull()
    expect(await readFile(path, 'utf8')).toBe(merged)
    const exported = await createStandardsClient({ project }).toJSON()
    expect(exported.error).toBeNull()
    if (!isErr(exported)) {
      expect(exported.value.standards[0]?.provenance.customized).toBe(true)
    }
    const again = await prepareUpdate({
      project,
      config: nextConfig.value,
    })
    expect(again.error).toBeNull()
    if (!isErr(again)) {
      expect(
        again.value.packs[0]?.files.find((file) => file.path === 'docs/immutability.md')?.kind
      ).toBe('local')
    }
  })

  it.each(['local', 'config', 'lock', 'addition'])(
    'rejects a stale %s state without writing metadata',
    async (change) => {
      const { project, directory } = await setup()
      const config = await readWorkspaceConfig({ project })
      if (isErr(config)) {
        expect(config.error).toBeNull()
        return
      }
      const review = await prepareUpdate({
        project,
        config: config.value,
      })
      if (isErr(review)) {
        expect(review.error).toBeNull()
        return
      }
      if (change === 'local') {
        await writeFile(join(directory, 'README.md'), 'Changed after review\n')
      }
      if (change === 'addition') {
        await writeFile(join(directory, 'new.md'), 'Not reviewed\n')
      }
      if (change === 'config') {
        await writeFile(
          join(project, 'granary.json'),
          `${await readFile(join(project, 'granary.json'), 'utf8')}\n`
        )
      }
      if (change === 'lock') {
        await writeFile(
          join(project, 'granary-lock.json'),
          `${await readFile(join(project, 'granary-lock.json'), 'utf8')}\n`
        )
      }
      const lock = await readFile(join(project, 'granary-lock.json'), 'utf8')
      const result = await applyUpdate({ project, config: config.value, review: review.value })
      expect(isErr(result)).toBe(true)
      expect(await readFile(join(project, 'granary-lock.json'), 'utf8')).toBe(lock)
    }
  )

  it('records intentional additions and deletions and refuses later unaccepted edits', async () => {
    const { project, directory } = await setup()
    await writeFile(join(directory, 'local.md'), 'Local reference\n')
    await rm(join(directory, 'immutability.md'))
    const config = await readWorkspaceConfig({ project })
    if (isErr(config)) {
      expect(config.error).toBeNull()
      return
    }
    const prepared = await prepareUpdate({
      project,
      config: config.value,
    })
    if (isErr(prepared)) {
      expect(prepared.error).toBeNull()
      return
    }
    const result = await applyUpdate({ project, config: config.value, review: prepared.value })
    expect(result.error).toBeNull()
    if (isErr(result)) {
      return
    }
    expect(result.value.packs[0]?.customizations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: 'local.md',
          content: Buffer.from('Local reference\n').toString('base64'),
        }),
        expect.objectContaining({ path: 'immutability.md', content: null, hash: null }),
      ])
    )
    await rm(join(directory, 'local.md'))
    const next = await readWorkspaceConfig({ project })
    if (isErr(next)) {
      expect(next.error).toBeNull()
      return
    }
    expect((await installPacks({ project, config: next.value })).error).toBeNull()
    expect(await readFile(join(directory, 'local.md'), 'utf8')).toBe('Local reference\n')
    expect((await createStandardsClient({ project }).toJSON()).error).toBeNull()
    await writeFile(join(directory, 'local.md'), 'Unaccepted edit\n')
    expect(isErr(await installPacks({ project, config: next.value }))).toBe(true)
    expect(await readFile(join(directory, 'local.md'), 'utf8')).toBe('Unaccepted edit\n')
  })

  it('restores retained content when upstream removes a file and accepts an upstream-only deletion', async () => {
    const { project, source, directory } = await setup({ extraFiles: true })
    await writeFile(join(directory, 'retained.md'), 'Keep this customization\n')
    await rm(join(source, 'retained.md'))
    await rm(join(source, 'removed.md'))
    const config = await readWorkspaceConfig({ project })
    if (isErr(config)) {
      expect(config.error).toBeNull()
      return
    }
    const prepared = await prepareUpdate({
      project,
      config: config.value,
    })
    if (isErr(prepared)) {
      expect(prepared.error).toBeNull()
      return
    }
    const review = {
      ...prepared.value,
      packs: prepared.value.packs.map((pack) => ({
        ...pack,
        files: pack.files.map((file) => {
          if (file.path === 'docs/retained.md') {
            return { ...file, decision: 'local' as const }
          }
          return file
        }),
      })),
    }
    const result = await applyUpdate({ project, config: config.value, review })
    expect(result.error).toBeNull()
    if (isErr(result)) {
      return
    }
    expect(await readFile(join(directory, 'retained.md'), 'utf8')).toBe('Keep this customization\n')
    await expect(readFile(join(directory, 'removed.md'))).rejects.toMatchObject({ code: 'ENOENT' })
    await rm(join(directory, 'retained.md'))
    const next = await readWorkspaceConfig({ project })
    if (isErr(next)) {
      expect(next.error).toBeNull()
      return
    }
    expect((await installPacks({ project, config: next.value })).error).toBeNull()
    expect(await readFile(join(directory, 'retained.md'), 'utf8')).toBe('Keep this customization\n')
  })

  it('rejects malformed merged standards, tampered upstream content, and symlinked destinations before writing', async () => {
    const { project, source, directory } = await setup()
    const config = await readWorkspaceConfig({ project })
    if (isErr(config)) {
      expect(config.error).toBeNull()
      return
    }
    const prepared = await prepareUpdate({
      project,
      config: config.value,
    })
    if (isErr(prepared)) {
      expect(prepared.error).toBeNull()
      return
    }
    const before = await readFile(join(project, 'granary-lock.json'), 'utf8')
    const invalidMerge = {
      ...prepared.value,
      packs: prepared.value.packs.map((pack) => ({
        ...pack,
        files: pack.files.map((file) => {
          if (file.path === 'docs/immutability.md') {
            return { ...file, decision: 'merge' as const, merged: 'Not a standard\n' }
          }
          return file
        }),
      })),
    }
    expect(isErr(await applyUpdate({ project, config: config.value, review: invalidMerge }))).toBe(
      true
    )
    const tampered = {
      ...prepared.value,
      packs: prepared.value.packs.map((pack) => ({
        ...pack,
        files: pack.files.map((file) => ({ ...file, incoming: 'Tampered bytes\n' })),
      })),
    }
    expect(isErr(await applyUpdate({ project, config: config.value, review: tampered }))).toBe(true)
    await rm(join(directory, 'README.md'))
    await symlink(join(source, 'README.md'), join(directory, 'README.md'))
    expect(
      isErr(await applyUpdate({ project, config: config.value, review: prepared.value }))
    ).toBe(true)
    expect(await readFile(join(project, 'granary-lock.json'), 'utf8')).toBe(before)
  })

  it('selects nested docs and source automatically when files are omitted', async () => {
    const { project, source } = await setup()
    await writeFile(
      join(source, 'granary.json'),
      JSON.stringify({
        name: 'example/standards',
        version: '0.1.1',
        description: 'Recursive Markdown.',
        documents: { 'immutability.md': 'standards' },
      })
    )
    await mkdir(join(source, 'nested'))
    await writeFile(join(source, 'nested', 'guide.md'), 'Nested reference\n')
    await writeFile(join(source, 'nested', 'ignored.ts'), 'export const ignored = true\n')
    const config = await readWorkspaceConfig({ project })
    if (isErr(config)) {
      expect(config.error).toBeNull()
      return
    }
    const prepared = await prepareUpdate({
      project,
      config: config.value,
    })
    expect(prepared.error).toBeNull()
    if (isErr(prepared)) {
      return
    }
    expect(prepared.value.packs[0]?.files.map((file) => file.path)).toContain(
      'docs/nested/guide.md'
    )
    expect(prepared.value.packs[0]?.files.map((file) => file.path)).toContain(
      'docs/nested/ignored.ts'
    )
    const result = await applyUpdate({ project, config: config.value, review: prepared.value })
    expect(result.error).toBeNull()
    expect(await readFile(join(project, 'reference/nested/guide.md'), 'utf8')).toBe(
      'Nested reference\n'
    )
  })

  it('removes an explicitly reviewed upstream pack and leaves valid empty consumer intent', async () => {
    const { project, directory } = await setup()
    await writeFile(join(project, 'granary.json'), JSON.stringify({ name: 'consumer', packs: {} }))
    const config = await readWorkspaceConfig({ project, allowChanges: true })
    if (isErr(config)) {
      expect(config.error).toBeNull()
      return
    }
    const prepared = await prepareUpdate({
      project,
      config: config.value,
    })
    expect(prepared.error).toBeNull()
    if (isErr(prepared)) {
      return
    }
    expect(prepared.value.packs[0]?.incoming).toBeNull()
    const applied = await applyUpdate({ project, config: config.value, review: prepared.value })
    expect(applied.error).toBeNull()
    if (isErr(applied)) {
      return
    }
    expect(applied.value.packs).toHaveLength(0)
    await expect(readFile(join(directory, 'README.md'))).rejects.toMatchObject({ code: 'ENOENT' })
    expect(await readFile(join(project, '.granary/context/INDEX.md'), 'utf8')).not.toContain(
      'example/standards'
    )
    const restored = await readWorkspaceConfig({ project })
    expect(restored.error).toBeNull()
    if (!isErr(restored)) {
      expect((await installPacks({ project, config: restored.value })).error).toBeNull()
    }
  })

  it('keeps binary customizations lossless across update and restoration', async () => {
    const { project, directory } = await setup()
    const local = Buffer.from([0xff, 0x00, 0xfe])
    await writeFile(join(directory, 'binary.md'), local)
    const config = await readWorkspaceConfig({ project })
    if (isErr(config)) {
      expect(config.error).toBeNull()
      return
    }
    const prepared = await prepareUpdate({
      project,
      config: config.value,
    })
    if (isErr(prepared)) {
      expect(prepared.error).toBeNull()
      return
    }
    expect(
      prepared.value.packs[0]?.files.find((file) => file.path === 'docs/binary.md')?.encoding
    ).toBe('base64')
    const applied = await applyUpdate({ project, config: config.value, review: prepared.value })
    expect(applied.error).toBeNull()
    await rm(join(directory, 'binary.md'))
    const next = await readWorkspaceConfig({ project })
    if (isErr(next)) {
      expect(next.error).toBeNull()
      return
    }
    expect((await installPacks({ project, config: next.value })).error).toBeNull()
    expect(await readFile(join(directory, 'binary.md'))).toEqual(local)
  })
})

async function setup({ extraFiles = false }: { readonly extraFiles?: boolean } = {}): Promise<{
  readonly project: string
  readonly source: string
  readonly directory: string
}> {
  const project = await mkdtemp(join(tmpdir(), 'granary-update-'))
  onTestFinished(() => rm(project, { recursive: true, force: true }))
  const source = join(project, 'source')
  await cp(fixture, source, { recursive: true })
  if (extraFiles) {
    await writeFile(join(source, 'retained.md'), 'Baseline\n')
    await writeFile(join(source, 'removed.md'), 'Baseline\n')
  }
  const client = createGranary({ project })
  expect(
    (
      await client.packs.add({
        source: { provider: 'local', path: source },
        output: 'reference',
      })
    ).error
  ).toBeNull()
  return { project, source, directory: join(project, 'reference') }
}
