import { execFile } from 'node:child_process'
import { readFile, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'

import { describe, expect, it } from 'vitest'

import { installedCli, temporaryDirectory } from './support.ts'
import packageJson from '#/package.json' with { type: 'json' }

const execute = promisify(execFile)

describe('installed granary-ai distribution', { timeout: 180_000 }, () => {
  it('installs the tarball and runs add, list, review, apply, and restore through its bin shim', async () => {
    const { project, run } = await installedCli()
    const packageDirectory = join(project, 'node_modules/granary-ai')
    const packedManifest = JSON.parse(
      await readFile(join(packageDirectory, 'package.json'), 'utf8')
    )
    expect(packedManifest).toMatchObject({
      name: 'granary-ai',
      version: packageJson.version,
      license: 'MIT',
      engines: { node: '>=26' },
      repository: { directory: 'packages/granary' },
    })
    expect(await readFile(join(packageDirectory, 'README.md'), 'utf8')).toContain(
      'npm install --global granary-ai'
    )
    expect(await readFile(join(packageDirectory, 'LICENSE'), 'utf8')).toContain('MIT License')
    const source = await temporaryDirectory()
    await writeFile(join(source, 'README.md'), '# Distribution v1\n')
    const instructions =
      '# Consumer rules\nPreserve this.\n<docs-index>\nOther index\n</docs-index>\n'
    await writeFile(join(project, 'AGENTS.md'), instructions)
    expect((await run(['--help'])).stdout).toContain('granary')
    expect((await run(['--version'])).stdout.trim()).toBe(packageJson.version)
    const added = await run(['add', source, '--output', 'reference'])
    expect(added.stdout + added.stderr).toContain('Installed context. 1 pack(s) locked.')
    expect((await run(['list'])).stdout).toContain('reference')
    expect(await readFile(join(project, 'reference/README.md'), 'utf8')).toBe('# Distribution v1\n')
    const indexed = await readFile(join(project, 'AGENTS.md'), 'utf8')
    expect(indexed.startsWith(instructions)).toBe(true)
    expect(indexed).toContain('<granary-context>')
    expect(indexed).toContain('[reference/README.md](reference/README.md)')
    expect(indexed).not.toContain('INDEX.md')
    const imported = await execute(
      process.execPath,
      [
        '--input-type=module',
        '-e',
        `
      const { granary } = await import('granary-ai')
      const { createGranary } = await import('granary-ai/core')
      const { definePlugin } = await import('granary-ai/plugins')
      const { standardsPlugin } = await import('granary-ai/plugins/standards')
      const { run } = await import('granary-ai/cli')
      const result = await granary().packs.list()
      console.log(JSON.stringify({ ok: result.ok, packs: result.value?.length, exports: [createGranary, definePlugin, standardsPlugin, run].map(value => typeof value) }))
    `,
      ],
      { cwd: project, timeout: 30_000 }
    )
    expect(JSON.parse(imported.stdout)).toEqual({
      ok: true,
      packs: 1,
      exports: ['function', 'function', 'function', 'function'],
    })
    await writeFile(join(source, 'README.md'), '# Distribution v2\n')
    const review = await run(['update'])
    expect(await readFile(join(project, 'AGENTS.md'), 'utf8')).toBe(indexed)
    expect(JSON.parse(review.stdout)).toMatchObject({
      schemaVersion: 1,
      packs: [{ name: expect.any(String) }],
    })
    await writeFile(join(project, 'review.json'), review.stdout)
    await run(['update', '--apply', 'review.json'])
    expect(await readFile(join(project, 'reference/README.md'), 'utf8')).toBe('# Distribution v2\n')
    expect(await readFile(join(project, 'AGENTS.md'), 'utf8')).toBe(indexed)
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
    for (const name of ['author-pack', 'customize-pack', 'review-update', 'contribute-upstream']) {
      const skill = await readFile(
        join(project, 'node_modules/granary-ai/skills', `granary-${name}`, 'SKILL.md'),
        'utf8'
      )
      expect(skill).toContain('authored')
      expect(skill).toMatch(/ordinary|arbitrary/)
    }
    const customize = await readFile(
      join(project, 'node_modules/granary-ai/skills/granary-customize-pack/SKILL.md'),
      'utf8'
    )
    expect(customize).toContain('plugins.standards.rules')
    expect(customize).not.toContain('root `standards`')
  })
})
