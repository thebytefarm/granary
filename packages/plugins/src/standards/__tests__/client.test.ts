import { cp, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { isErr, unwrap } from 'massaman/control'
import { describe, expect, it, onTestFinished } from 'vitest'

import { createGranary } from '@granary/core'
import { createStandardsClient } from '#/standards/client.ts'
import { setupStandards } from '#/standards/setup.ts'
import { standardsPlugin } from '#/standards/plugin.ts'
import { expectSuccess } from '#/__tests__/support.ts'

const fixture = fileURLToPath(new URL('../__fixtures__/standards-pack/', import.meta.url))

describe('standards extraction', () => {
  it('does not read unrelated context documents during standards interpretation', async () => {
    const project = await createProject()
    expectSuccess(
      await createGranary({ project }).packs.add({
        source: { provider: 'local', path: fixture },
        output: 'reference',
      })
    )
    await rm(join(project, 'reference/README.md'))
    expect((await createStandardsClient({ project }).toJSON()).ok).toBe(true)
  })

  it('composes typed conversions without writing or requiring extraction first', async () => {
    const project = await createProject()
    const client = createGranary({ project, plugins: [standardsPlugin({ source: fixture })] })
    const before = await readdir(project)
    const yaml = expectSuccess(await client.standards.toYAML())
    const json = expectSuccess(await client.standards.toJSON())
    expect(json.standards.length).toBeGreaterThan(0)
    expect(JSON.parse(yaml)).toEqual(json)
    expect(expectSuccess(await client.standards.toMarkdown())).toContain(json.standards[0]?.title)
    expect(await readdir(project)).toEqual(before)
  })

  it('rejects plugin-invalid settings while core preserves them as data', async () => {
    const project = await createProject()
    await writeFile(
      join(project, 'granary.json'),
      JSON.stringify({ name: 'app', plugins: { standards: null, other: { retained: true } } })
    )
    const client = createGranary({ project })
    expect((await client.packs.list()).ok).toBe(true)
    const result = await createStandardsClient({ project, source: fixture }).toJSON()
    expect(result).toMatchObject({ ok: false, error: { kind: 'invalid' } })
    const before = await readFile(join(project, 'granary.json'), 'utf8')
    expect((await setupStandards({ project })).ok).toBe(false)
    expect(await readFile(join(project, 'granary.json'), 'utf8')).toBe(before)
  })

  it('classifies only declared standards and preserves effective enforcement separately', async () => {
    const project = await createProject()
    const config = {
      name: 'consumer',
      packs: { [`file:${fixture}`]: {} },
      plugins: {
        standards: {
          rules: {
            'example/standards#immutable-values/preserve-inputs': {
              markers: ['[lint: immutable-inputs]', '[review]'],
              notes: 'The check covers arrays; review resource handles.',
            },
          },
        },
      },
    }
    await writeFile(join(project, 'granary.json'), JSON.stringify(config))
    const result = await createStandardsClient({ project, source: fixture }).toJSON()
    expect(isErr(result)).toBe(false)
    if (isErr(result)) {
      return
    }
    expect(result.value.standards).toHaveLength(1)
    expect(result.value.standards[0]?.rules[0]).toMatchObject({
      qualifiedId: 'example/standards#immutable-values/preserve-inputs',
      enforcement: { markers: ['[review]'] },
      effectiveEnforcement: {
        markers: ['[lint: immutable-inputs]', '[review]'],
        notes: expect.stringContaining('resource handles'),
      },
    })
    expect(result.value.standards[0]?.rules[1]?.effectiveEnforcement.markers).toEqual(['[review]'])
    expect(await readFile(join(project, 'granary.json'), 'utf8')).toBe(JSON.stringify(config))
  })

  it('locks document kinds and extracts intentional installed edits without rewriting upstream hashes', async () => {
    const project = await createProject()
    const added = await createGranary({ project }).packs.add({
      source: { provider: 'local', path: fixture },
      output: 'reference',
    })
    expect(isErr(added)).toBe(false)
    const locked = await readFile(join(project, 'granary-lock.json'), 'utf8')
    const path = join(project, 'reference/immutability.md')
    const initial = await readFile(path, 'utf8')
    await writeFile(
      path,
      initial.replace('mutate function arguments.', 'mutate function arguments or local policy.')
    )
    const extracted = await createStandardsClient({ project }).toJSON()
    expect(isErr(extracted)).toBe(false)
    if (!isErr(extracted)) {
      expect(extracted.value.standards[0]?.provenance.customized).toBe(true)
      expect(extracted.value.standards[0]?.rules[0]?.statement).toContain('local policy')
    }
    const lock = await createGranary({ project }).locks.read({ required: true })
    expect(isErr(lock)).toBe(false)
    if (!isErr(lock)) {
      expect(lock.value.packs[0]?.groups[0]?.documents).toEqual({ 'immutability.md': 'standards' })
    }
    expect(await readFile(join(project, 'granary-lock.json'), 'utf8')).toBe(locked)
  })

  it('rejects unknown rule mappings and unsupported document kinds', async () => {
    const project = await createProject()
    await writeFile(
      join(project, 'granary.json'),
      JSON.stringify({
        name: 'consumer',
        plugins: { standards: { rules: { unknown: { markers: ['[review]'] } } } },
      })
    )
    expect(isErr(await createStandardsClient({ project, source: fixture }).toJSON())).toBe(true)
    const source = join(project, 'source')
    await cp(fixture, source, { recursive: true })
    await writeFile(
      join(source, 'granary.json'),
      JSON.stringify({
        name: 'example/bad',
        version: '0.1.0',
        description: 'Unknown kind.',
        files: { include: ['*.md'] },
        documents: { 'immutability.md': 'unknown' },
      })
    )
    expect(isErr(await createStandardsClient({ project, source }).toJSON())).toBe(true)
  })

  it('installs and restores classified bytes without requiring standards interpretation', async () => {
    const project = await createProject()
    const source = join(project, 'source')
    await cp(fixture, source, { recursive: true })
    const malformed = '<standard id="unfinished">\n'
    await writeFile(join(source, 'immutability.md'), malformed)
    const client = createGranary({ project })
    unwrap(
      await client.packs.add({ source: { provider: 'local', path: source }, output: 'reference' })
    )
    await rm(join(project, 'reference/immutability.md'))
    unwrap(await client.packs.install())
    expect(await readFile(join(project, 'reference/immutability.md'), 'utf8')).toBe(malformed)
    expect(isErr(await createStandardsClient({ project }).toJSON())).toBe(true)
  })

  it('sets up review-only defaults without erasing existing mappings or dependency intent', async () => {
    const project = await createProject()
    const config = {
      name: 'consumer',
      packs: { [`file:${fixture}`]: {} },
    }
    await writeFile(join(project, 'granary.json'), JSON.stringify(config))
    expect(isErr(await setupStandards({ project }))).toBe(false)
    const configured = await readFile(join(project, 'granary.json'), 'utf8')
    expect(JSON.parse(configured)).toMatchObject({
      ...config,
      plugins: { standards: { default: '[review]', rules: {} } },
    })
    expect(isErr(await setupStandards({ project }))).toBe(false)
    expect(await readFile(join(project, 'granary.json'), 'utf8')).toBe(configured)
  })
})

async function createProject(): Promise<string> {
  const project = await mkdtemp(join(tmpdir(), 'granary-extraction-'))
  onTestFinished(() => rm(project, { recursive: true, force: true }))
  return project
}
