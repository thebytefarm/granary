import { readFile, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

import { installedCli, temporaryDirectory } from './support.ts'

describe('installed granary-ai distribution', { timeout: 180_000 }, () => {
  it('installs the tarball and runs add, list, review, apply, and restore through its bin shim', async () => {
    const { project, run } = await installedCli()
    const source = await temporaryDirectory()
    await writeFile(join(source, 'README.md'), '# Distribution v1\n')
    expect((await run(['--help'])).stdout).toContain('granary')
    const added = await run(['add', source, '--output', 'reference'])
    expect(added.stdout + added.stderr).toContain('Installed context. 1 pack(s) locked.')
    expect((await run(['list'])).stdout).toContain('reference')
    expect(await readFile(join(project, 'reference/README.md'), 'utf8')).toBe('# Distribution v1\n')
    await writeFile(join(source, 'README.md'), '# Distribution v2\n')
    const review = await run(['update'])
    expect(JSON.parse(review.stdout)).toMatchObject({
      schemaVersion: 1,
      packs: [{ name: expect.any(String) }],
    })
    await writeFile(join(project, 'review.json'), review.stdout)
    await run(['update', '--apply', 'review.json'])
    expect(await readFile(join(project, 'reference/README.md'), 'utf8')).toBe('# Distribution v2\n')
    await rm(join(project, 'reference/README.md'))
    const restored = await run(['install'])
    expect(restored.stdout + restored.stderr).toContain('Restored 1 locked pack(s).')
    expect(await readFile(join(project, 'reference/README.md'), 'utf8')).toBe('# Distribution v2\n')
    const fixture = new URL(
      '../../../plugins/src/standards/__fixtures__/standards-pack/',
      import.meta.url
    )
    const standards = await run(['standards', '--source', fileURLToPath(fixture)])
    expect(JSON.parse(standards.stdout)).toMatchObject({
      schemaVersion: 1,
      standards: [{ id: 'immutable-values' }],
    })
  })
})
