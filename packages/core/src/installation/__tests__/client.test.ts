import { access, mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { isErr, unwrap } from 'massaman/control'
import { describe, expect, it, onTestFinished } from 'vitest'

import { createInstallationClient } from '#/installation/client.ts'
import { EMPTY_LOCK } from '#/locks/schema.ts'
import { resolveWorkspaceConfig } from '#/workspace/read.ts'

describe('workspace installations', () => {
  it('prepares without writing and applies the captured bytes rather than rereading changed sources', async () => {
    const { project, source, config } = await installation()
    const client = createInstallationClient({ project })
    const before = await readdir(project)
    const prepared = unwrap(
      await client.prepare({
        kind: 'add',
        config: { ...config, packs: [] },
        previous: EMPTY_LOCK,
        requests: config.packs,
      })
    )
    expect(await readdir(project)).toEqual(before)
    await writeFile(join(source, 'README.md'), '# Later upstream\n')
    const lock = unwrap(await client.apply(prepared))
    expect(lock.packs).toHaveLength(1)
    expect(await readFile(join(project, 'reference/README.md'), 'utf8')).toBe(
      '# Captured upstream\n'
    )
  })

  it('preserves metadata edited after preparation and rolls back earlier payload writes', async () => {
    const { project, config } = await installation()
    const client = createInstallationClient({ project })
    const prepared = unwrap(
      await client.prepare({
        kind: 'add',
        config: { ...config, packs: [] },
        previous: EMPTY_LOCK,
        requests: config.packs,
      })
    )
    await writeFile(join(project, 'granary.json'), '{"name":"concurrent-edit"}\n')
    const result = await client.apply(prepared)
    expect(isErr(result) && result.error.kind).toBe('conflict')
    expect(await readFile(join(project, 'granary.json'), 'utf8')).toBe(
      '{"name":"concurrent-edit"}\n'
    )
    await expect(access(join(project, 'reference/README.md'))).rejects.toMatchObject({
      code: 'ENOENT',
    })
    await expect(access(join(project, 'granary-lock.json'))).rejects.toMatchObject({
      code: 'ENOENT',
    })
  })

  it('rejects unmanaged destinations during preparation without changing consumer files', async () => {
    const { project, config } = await installation()
    await writeFile(join(project, 'reference'), 'Consumer notes')
    const client = createInstallationClient({ project })
    expect(
      isErr(
        await client.prepare({
          kind: 'add',
          config: { ...config, packs: [] },
          previous: EMPTY_LOCK,
          requests: config.packs,
        })
      )
    ).toBe(true)
    expect(await readFile(join(project, 'reference'), 'utf8')).toBe('Consumer notes')
    await expect(access(join(project, 'granary-lock.json'))).rejects.toMatchObject({
      code: 'ENOENT',
    })
  })
})

/**
 * @private
 */
async function installation() {
  const project = await workspace()
  const source = await workspace()
  await writeFile(join(source, 'README.md'), '# Captured upstream\n')
  const document = { name: 'consumer', packs: { [`file:${source}`]: { output: 'reference' } } }
  await writeFile(join(project, 'granary.json'), JSON.stringify(document))
  const config = unwrap(await resolveWorkspaceConfig({ project, document }))
  return { project, source, config }
}

/**
 * @private
 */
async function workspace(): Promise<string> {
  const project = await mkdtemp(join(tmpdir(), 'granary-installation-client-'))
  onTestFinished(() => rm(project, { recursive: true, force: true }))
  return project
}
