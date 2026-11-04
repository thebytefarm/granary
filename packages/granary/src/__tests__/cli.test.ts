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
  it('exposes init and create without legacy command scaffolding', async () => {
    const { stdout } = await execute(process.execPath, [entry, '--help'])
    expect(stdout).toContain('granary')
    expect(stdout).toContain('update')
    expect(stdout).toContain('init')
    expect(stdout).toContain('granary create <directory>')
    expect(stdout).not.toMatch(/granary (?:about|pack)\b/)
    expect(stdout).not.toMatch(/\bdiff\b/)
  })

  it('reports the package version', async () => {
    const { stdout } = await execute(process.execPath, [entry, '--version'])
    expect(stdout.trim()).toBe(packageJson.version)
  })

  it('initializes and validates a scaffold through the built executable', async () => {
    const project = await workspace()
    const result = await cli({ project, args: ['init', '--yes', '--name', 'consumer'] })
    expect(result.stdout + result.stderr).toContain('Created granary.json.')
    expect(JSON.parse(await readFile(join(project, 'granary.json'), 'utf8'))).toEqual({
      name: 'consumer',
      packs: {},
    })
    expect(await readdir(project)).toEqual(['granary.json'])
    const validated = await cli({ project, args: ['validate'] })
    expect(validated.stdout + validated.stderr).toContain('Pack manifest is valid.')
    await expect(cli({ project, args: ['init', '--yes'] })).rejects.toMatchObject({ code: 1 })
    expect(JSON.parse(await readFile(join(project, 'granary.json'), 'utf8'))).toEqual({
      name: 'consumer',
      packs: {},
    })
  })

  it('requires an explicit scaffold flag when init has no terminal', async () => {
    const project = await workspace()
    await expect(cli({ project, args: ['init'] })).rejects.toMatchObject({ code: 1 })
    expect(await readdir(project)).toEqual([])
  })

  it('detects the consumer name from package.json through the executable', async () => {
    const project = await workspace()
    await writeFile(join(project, 'package.json'), JSON.stringify({ name: '@team/web-app' }))
    await cli({ project, args: ['init', '--yes'] })
    expect(JSON.parse(await readFile(join(project, 'granary.json'), 'utf8'))).toEqual({
      name: 'team/web-app',
      packs: {},
    })
  })

  it('authors and installs a reusable pack separately from consumer setup', async () => {
    const source = await workspace()
    const project = await workspace()
    await writeFile(join(source, 'README.md'), '# Authored reference\n')
    await writeFile(join(source, 'unselected.txt'), 'Not reference material')
    const authored = await cli({
      project,
      args: ['create', source, '--yes', '--name', 'team/reference', '--pack-version', '1.2.0'],
    })
    expect(authored.stdout + authored.stderr).toContain('Created pack definition')
    expect(await readdir(project)).toEqual([])
    expect(JSON.parse(await readFile(join(source, 'granary.json'), 'utf8'))).toEqual({
      name: 'team/reference',
      version: '1.2.0',
      files: { include: ['**/*.md'] },
    })
    const validated = await cli({ project: source, args: ['validate'] })
    expect(validated.stdout + validated.stderr).toContain('Pack manifest is valid.')
    await cli({ project, args: ['init', '--yes', '--name', 'consumer'] })
    await cli({ project, args: ['add', source, '--output', 'reference'] })
    expect(await readFile(join(project, 'reference/README.md'), 'utf8')).toBe(
      '# Authored reference\n'
    )
    expect(await readdir(join(project, 'reference'))).toEqual(['README.md'])
  })

  it('requires an explicit pack target rather than repurposing the consumer root', async () => {
    const project = await workspace()
    await expect(cli({ project, args: ['create', '--yes'] })).rejects.toMatchObject({
      code: 1,
    })
    expect(await readdir(project)).toEqual([])
  })

  it.each(['about', 'pack'])(
    'rejects the removed %s command without writing project state',
    async (command) => {
      const project = await workspace()
      await expect(cli({ project, args: [command] })).rejects.toMatchObject({ code: 1 })
      expect(await readdir(project)).toEqual([])
    }
  )

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

  it('adopts through install <source>, while bare install restores and protects local edits', async () => {
    const project = await workspace()
    const source = await pack()
    await cli({ project, args: ['install', source, '--output', 'reference'] })
    const config = await readFile(join(project, 'granary.json'), 'utf8')
    const lock = await readFile(join(project, 'granary-lock.json'), 'utf8')
    await cli({ project, args: ['install'] })
    await writeFile(join(project, 'reference/README.md'), '# Local edit\n')
    await expect(cli({ project, args: ['install'] })).rejects.toMatchObject({ code: 1 })
    expect(await readFile(join(project, 'reference/README.md'), 'utf8')).toBe('# Local edit\n')
    expect(await readFile(join(project, 'granary.json'), 'utf8')).toBe(config)
    expect(await readFile(join(project, 'granary-lock.json'), 'utf8')).toBe(lock)
    await rm(join(project, 'reference/README.md'))
    await cli({ project, args: ['install'] })
    expect(await readFile(join(project, 'reference/README.md'), 'utf8')).toBe('# Fixture\n')
  })

  it.each(['add', 'install'])(
    'rejects unsupported shorthand through %s without writing consumer state',
    async (command) => {
      const project = await workspace()
      await expect(cli({ project, args: [command, 'nextjs@^16'] })).rejects.toMatchObject({
        code: 1,
      })
      expect(await readdir(project)).toEqual([])
    }
  )

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
