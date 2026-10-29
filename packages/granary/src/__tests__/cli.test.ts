import { execFile } from 'node:child_process'
import { access, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'

import { describe, expect, it, onTestFinished } from 'vitest'

import packageJson from '#/package.json' with { type: 'json' }

const execute = promisify(execFile)
const entry = fileURLToPath(new URL('../../dist/cli.js', import.meta.url))

describe('built Granary CLI', { timeout: 15_000 }, () => {
  it('exposes current commands without the removed diff command', async () => {
    const { stdout } = await execute(process.execPath, [entry, '--help'])
    expect(stdout).toContain('granary')
    expect(stdout).toContain('about')
    expect(stdout).toContain('update')
    expect(stdout).not.toMatch(/\bdiff\b/)
  })

  it('reports the package version', async () => {
    const { stdout } = await execute(process.execPath, [entry, '--version'])
    expect(stdout.trim()).toBe(packageJson.version)
  })

  it('runs the bundled about command', async () => {
    const { stdout, stderr } = await execute(process.execPath, [entry, 'about'])
    expect(stdout + stderr).toContain('Install local and Git packs')
  })

  it('validates an independent checked-in manifest through maltty', async () => {
    const source = fileURLToPath(new URL('../../../../packs/rust/', import.meta.url))
    const result = await cli({ project: source, args: ['validate'] })
    expect(result.stdout + result.stderr).toContain('Pack manifest is valid.')
  })

  it.each([
    ['invalid fields', JSON.stringify({ name: 'broken', files: { include: ['../outside.md'] } })],
    ['malformed JSON', '{invalid'],
    ['obsolete catalog fields', JSON.stringify({ schemaVersion: 1, packs: {} })],
  ])('rejects %s without changing the manifest', async (_, document) => {
    const project = await workspace()
    await writeFile(join(project, 'granary.json'), document)
    await expect(cli({ project, args: ['validate'] })).rejects.toMatchObject({ code: 1 })
    expect(await readFile(join(project, 'granary.json'), 'utf8')).toBe(document)
  })

  it('rejects a directory without a manifest', async () => {
    const project = await workspace()
    await expect(cli({ project, args: ['validate'] })).rejects.toMatchObject({ code: 1 })
  })

  it('adds, lists, and restores a current pack through the executable', async () => {
    const project = await workspace()
    const source = await pack()
    const added = await cli({ project, args: ['add', source, '--output', 'reference'] })
    expect(added.stdout + added.stderr).toContain('Installed context.')
    expect(await readFile(join(project, 'reference/README.md'), 'utf8')).toBe('# Fixture\n')
    const listed = await cli({ project, args: ['list'] })
    expect(listed.stdout + listed.stderr).toContain('reference')
    await rm(join(project, 'reference'), { recursive: true })
    const restored = await cli({ project, args: ['install'] })
    expect(restored.stdout + restored.stderr).toContain('Restored 1 locked pack(s).')
    expect(await readFile(join(project, 'reference/README.md'), 'utf8')).toBe('# Fixture\n')
  })

  it('lists available declarations without creating consumer files', async () => {
    const project = await workspace()
    const source = await pack()
    const result = await cli({ project, args: ['add', source, '--list'] })
    expect(result.stdout + result.stderr).toContain('example/rules')
    expect(await readdir(project)).toEqual([])
  })

  it('preserves malformed consumer intent during add', async () => {
    const project = await workspace()
    const source = await pack()
    await writeFile(join(project, 'granary.json'), '{invalid')
    await expect(cli({ project, args: ['add', source] })).rejects.toMatchObject({ code: 1 })
    expect(await readFile(join(project, 'granary.json'), 'utf8')).toBe('{invalid')
    await expect(access(join(project, 'granary-lock.json'))).rejects.toMatchObject({
      code: 'ENOENT',
    })
  })

  it('requires existing consumer intent for restoration', async () => {
    const project = await workspace()
    await expect(cli({ project, args: ['install'] })).rejects.toMatchObject({ code: 1 })
    expect(await readdir(project)).toEqual([])
  })

  it('rejects malformed lock metadata when listing', async () => {
    const project = await workspace()
    await writeFile(join(project, 'granary-lock.json'), '{invalid')
    await expect(cli({ project, args: ['list'] })).rejects.toMatchObject({ code: 1 })
  })

  it.each(['--branch', '--tag', '--commit'])(
    'rejects %s on local material before writing',
    async (flag) => {
      const project = await workspace()
      const source = await pack()
      await expect(cli({ project, args: ['add', source, flag, 'main'] })).rejects.toMatchObject({
        code: 1,
      })
      expect(await readdir(project)).toEqual([])
    }
  )

  it.each(['--content', '--ref', '--pack', '--install-dir', '--code-dir', '--package-version'])(
    'rejects removed %s syntax',
    async (flag) => {
      const project = await workspace()
      const source = await pack()
      await expect(cli({ project, args: ['add', source, flag, 'value'] })).rejects.toMatchObject({
        code: 1,
      })
      expect(await readdir(project)).toEqual([])
    }
  )
})

async function workspace(): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), 'granary-cli-'))
  onTestFinished(() => rm(directory, { recursive: true, force: true }))
  return directory
}

async function pack(): Promise<string> {
  const directory = await workspace()
  await writeFile(join(directory, 'README.md'), '# Fixture\n')
  await writeFile(
    join(directory, 'granary.json'),
    JSON.stringify({ name: 'example/rules', files: { include: ['README.md'] } })
  )
  return directory
}

async function cli({
  project,
  args,
}: {
  readonly project: string
  readonly args: readonly string[]
}): Promise<{ readonly stdout: string; readonly stderr: string }> {
  return execute(process.execPath, [entry, ...args, '--cwd', project], { encoding: 'utf8' })
}
