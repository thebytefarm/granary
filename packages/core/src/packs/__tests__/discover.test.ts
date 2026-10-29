import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { isErr, unwrap } from 'massaman/control'
import { describe, expect, it, onTestFinished } from 'vitest'

import { readSourceDocument } from '#/manifests/read.ts'
import { findPacks } from '#/packs/discover.ts'

describe('declared pack discovery', () => {
  it('reports only root and declared members, including nested compositions', async () => {
    const project = await workspace()
    await writeFile(
      join(project, 'granary.json'),
      JSON.stringify({
        name: 'standards',
        packs: {
          recommended: {
            files: { include: [] },
            packs: { engineering: { files: { include: ['rules.md'] } } },
          },
          'github:example/reference': 'v1',
        },
      })
    )
    await mkdir(join(project, 'hidden'))
    await writeFile(join(project, 'hidden/granary.json'), '{ invalid JSON')
    const packs = unwrap(await findPacks({ project, source: { provider: 'local', path: '.' } }))
    expect(packs.map((pack) => pack.name)).toEqual([
      'standards',
      'recommended',
      'recommended/engineering',
    ])
  })

  it('keeps manifestless repositories installable without discovering legacy files', async () => {
    const project = await workspace()
    await writeFile(join(project, 'granary.pack.json'), '{ invalid JSON')
    await writeFile(join(project, 'granary.preset.json'), '{ invalid JSON')
    const document = unwrap(
      await readSourceDocument({
        opened: { directory: project, source: { provider: 'local', path: '.' } },
        prefix: '.',
      })
    )
    expect(document).toEqual({ document: { name: 'repository' }, hash: null })
    expect(unwrap(await findPacks({ project, source: { provider: 'local', path: '.' } }))).toEqual(
      []
    )
  })

  it.each([
    { schemaVersion: 1, packs: {} },
    { name: 'rules', files: ['*.md'] },
    { name: 'rules', includes: [] },
  ])(
    'rejects obsolete root formats rather than falling back to another reader',
    async (document) => {
      const project = await workspace()
      await writeFile(join(project, 'granary.json'), JSON.stringify(document))
      expect(isErr(await findPacks({ project, source: { provider: 'local', path: '.' } }))).toBe(
        true
      )
    }
  )

  it('rejects an invalid current manifest instead of treating it as absent', async () => {
    const project = await workspace()
    await writeFile(join(project, 'granary.json'), '{ invalid JSON')
    expect(isErr(await findPacks({ project, source: { provider: 'local', path: '.' } }))).toBe(true)
  })
})

/**
 * @private
 */
async function workspace(): Promise<string> {
  const project = await mkdtemp(join(tmpdir(), 'granary-discover-'))
  onTestFinished(() => rm(project, { recursive: true, force: true }))
  return project
}
