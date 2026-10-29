import { cp, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { isErr } from 'massaman/control'
import { describe, expect, it, onTestFinished } from 'vitest'

import { createGranary } from '#/client.ts'
import { hashContent } from '#/content/hash.ts'

const fixture = fileURLToPath(
  new URL('../../../../plugins/src/standards/__fixtures__/standards-pack/', import.meta.url)
)

describe('three-way update previews', () => {
  it('uses retained baselines after local source drift and distinguishes all change classes without writing', async () => {
    const { project, source } = await setup()
    await Promise.all(
      ['upstream', 'local', 'identical', 'conflict', 'removed'].map((name) =>
        writeFile(join(source, `${name}.md`), 'Baseline\n')
      )
    )
    const added = await createGranary({ project }).packs.add({
      source: { provider: 'local', path: source },
      output: 'reference',
    })
    expect(isErr(added)).toBe(false)
    const directory = join(project, 'reference')
    const lock = await readFile(join(project, 'granary-lock.json'), 'utf8')
    const config = await readFile(join(project, 'granary.json'), 'utf8')
    await writeFile(join(source, 'upstream.md'), 'Upstream\n')
    await writeFile(join(directory, 'local.md'), 'Local\n')
    await writeFile(join(source, 'identical.md'), 'Same\n')
    await writeFile(join(directory, 'identical.md'), 'Same\n')
    await writeFile(join(source, 'conflict.md'), 'Upstream\n')
    await writeFile(join(directory, 'conflict.md'), 'Local\n')
    await rm(join(source, 'removed.md'))
    await writeFile(join(directory, 'added-locally.md'), 'Custom guidance\n')
    const result = await createGranary({ project }).updates.prepare()
    expect(result.error).toBeNull()
    if (isErr(result)) {
      return
    }
    expect(result.value.packs[0]?.files).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: 'docs/README.md', kind: 'unchanged' }),
        expect.objectContaining({
          path: 'docs/upstream.md',
          kind: 'upstream',
          baseline: 'Baseline\n',
          local: 'Baseline\n',
          incoming: 'Upstream\n',
        }),
        expect.objectContaining({ path: 'docs/local.md', kind: 'local' }),
        expect.objectContaining({ path: 'docs/identical.md', kind: 'identical' }),
        expect.objectContaining({ path: 'docs/conflict.md', kind: 'conflict' }),
        expect.objectContaining({ path: 'docs/removed.md', kind: 'upstream', incoming: null }),
        expect.objectContaining({
          path: 'docs/added-locally.md',
          kind: 'local',
          baseline: null,
          incoming: null,
        }),
      ])
    )
    expect(await readFile(join(project, 'granary-lock.json'), 'utf8')).toBe(lock)
    expect(await readFile(join(project, 'granary.json'), 'utf8')).toBe(config)
    expect(await readFile(join(directory, 'conflict.md'), 'utf8')).toBe('Local\n')
  })

  it('rejects a missing baseline when the locked local source no longer matches', async () => {
    const { project, source } = await setup()
    expect(
      isErr(
        await createGranary({ project }).packs.add({
          source: { provider: 'local', path: source },
          output: 'reference',
        })
      )
    ).toBe(false)
    await rm(join(project, '.granary/cache/baselines'), { recursive: true })
    await writeFile(join(source, 'README.md'), 'Changed upstream\n')
    await writeFile(join(project, 'reference/README.md'), 'Changed locally\n')
    const result = await createGranary({ project }).updates.prepare()
    expect(isErr(result)).toBe(true)
    if (isErr(result)) {
      expect(result.error.message).toContain('Cannot recover the accepted baseline')
    }
  })

  it('recovers a missing baseline from unchanged installed bytes after local upstream drift', async () => {
    const { project, source } = await setup()
    expect(
      isErr(
        await createGranary({ project }).packs.add({
          source: { provider: 'local', path: source },
          output: 'reference',
        })
      )
    ).toBe(false)
    await rm(join(project, '.granary/cache/baselines'), { recursive: true })
    await writeFile(join(source, 'README.md'), 'Changed upstream\n')
    const result = await createGranary({ project }).updates.prepare()
    expect(result.error).toBeNull()
    if (!isErr(result)) {
      expect(result.value.packs[0]?.files).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            path: 'docs/README.md',
            kind: 'upstream',
            incoming: 'Changed upstream\n',
          }),
        ])
      )
    }
  })

  it.each(['corrupted', 'symlinked'])('rejects a %s retained baseline', async (kind) => {
    const { project, source } = await setup()
    expect(
      isErr(
        await createGranary({ project }).packs.add({
          source: { provider: 'local', path: source },
          output: 'reference',
        })
      )
    ).toBe(false)
    const original = await readFile(join(source, 'README.md'))
    const baseline = join(project, '.granary/cache/baselines', hashContent(original))
    if (kind === 'corrupted') {
      await writeFile(baseline, 'Invalid baseline\n')
    } else {
      await rm(baseline)
      await symlink(join(source, 'README.md'), baseline)
    }
    const result = await createGranary({ project }).updates.prepare()
    expect(isErr(result)).toBe(true)
    if (isErr(result)) {
      expect(result.error.message).toMatch(/Baseline integrity mismatch|[Ss]ymlink/)
    }
    expect(await readFile(join(project, 'reference/README.md'))).toEqual(original)
  })

  it('retains binary versions losslessly and keeps the baseline cache Git-ignored', async () => {
    const { project, source } = await setup()
    const before = Buffer.from([0xff, 0x00, 0x01])
    const incoming = Buffer.from([0xfe, 0x00, 0x02])
    await writeFile(join(source, 'binary.md'), before)
    expect(
      isErr(
        await createGranary({ project }).packs.add({
          source: { provider: 'local', path: source },
          output: 'reference',
        })
      )
    ).toBe(false)
    await writeFile(join(source, 'binary.md'), incoming)
    const result = await createGranary({ project }).updates.prepare()
    expect(result.error).toBeNull()
    if (!isErr(result)) {
      expect(result.value.packs[0]?.files).toContainEqual({
        path: 'docs/binary.md',
        kind: 'upstream',
        encoding: 'base64',
        baseline: before.toString('base64'),
        local: before.toString('base64'),
        incoming: incoming.toString('base64'),
        decision: 'incoming',
      })
    }
    expect(await readFile(join(project, '.granary/.gitignore'), 'utf8')).toBe('*\n')
  })
})

async function setup(): Promise<{ readonly project: string; readonly source: string }> {
  const project = await mkdtemp(join(tmpdir(), 'granary-three-way-'))
  onTestFinished(() => rm(project, { recursive: true, force: true }))
  const source = join(project, 'source')
  await cp(fixture, source, { recursive: true })
  return { project, source }
}
