import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { mockLog, runCommand, runHandler } from 'maltty/test'
import { describe, expect, it, onTestFinished } from 'vitest'

import { add } from '#/commands/add.ts'
import { install } from '#/commands/install.ts'
import { list } from '#/commands/list.ts'

describe('maltty command adapters', () => {
  it('reports handler outcomes while installing and restoring real files', async () => {
    const project = await workspace()
    const source = await workspace()
    const log = mockLog()
    await writeFile(join(source, 'README.md'), '# Handler integration\n')
    const added = await runHandler({
      cmd: add,
      overrides: { args: { cwd: project, source, output: 'reference' }, log },
    })
    expect(added.error).toBeUndefined()
    expect(log.info).toHaveBeenCalledWith('Installed context. 1 pack(s) locked.')
    const listed = await runHandler({ cmd: list, overrides: { args: { cwd: project }, log } })
    expect(listed.error).toBeUndefined()
    expect(log.info).toHaveBeenCalledWith(expect.stringContaining('reference'))
    await rm(join(project, 'reference/README.md'))
    const restored = await runHandler({ cmd: install, overrides: { args: { cwd: project }, log } })
    expect(restored.error).toBeUndefined()
    expect(log.info).toHaveBeenCalledWith('Restored 1 locked pack(s).')
    expect(await readFile(join(project, 'reference/README.md'), 'utf8')).toBe(
      '# Handler integration\n'
    )
  })

  it('returns a handler failure without writing invalid source intent', async () => {
    const project = await workspace()
    const result = await runHandler({
      cmd: add,
      overrides: { args: { cwd: project, source: project, branch: 'main' } },
    })
    expect(result.error).toBeInstanceOf(Error)
    expect(await readdir(project)).toEqual([])
  })

  it('routes positional and option arguments through the real maltty pipeline', async () => {
    const project = await workspace()
    const source = await workspace()
    await writeFile(join(source, 'README.md'), '# Routed\n')
    const result = await runCommand({
      name: 'granary',
      commands: { add },
      args: ['add', source, '--output', 'routed', '--cwd', project],
    })
    expect(result.error).toBeUndefined()
    expect(result.exitCode ?? 0).toBe(0)
    expect(await readFile(join(project, 'routed/README.md'), 'utf8')).toBe('# Routed\n')
  })

  it('uses install with a source as the same adoption pipeline, including output and discovery', async () => {
    const project = await workspace()
    const source = await workspace()
    await writeFile(join(source, 'README.md'), '# Alias\n')
    const discovered = await runCommand({
      name: 'granary',
      commands: { install },
      args: ['install', source, '--list', '--cwd', project],
    })
    expect(discovered.error).toBeUndefined()
    expect(await readdir(project)).toEqual([])
    const installed = await runCommand({
      name: 'granary',
      commands: { install },
      args: ['install', source, '--output', 'alias', '--cwd', project],
    })
    expect(installed.error).toBeUndefined()
    expect(await readFile(join(project, 'alias/README.md'), 'utf8')).toBe('# Alias\n')
  })

  it.each([
    ['--tag', ['unused']],
    ['--branch', ['unused']],
    ['--commit', ['unused']],
    ['--output', ['unused']],
    ['--list', []],
  ] as const)(
    'rejects adoption option %s without a source rather than silently restoring',
    async (flag, values) => {
      const project = await workspace()
      const result = await runCommand({
        name: 'granary',
        commands: { install },
        args: ['install', flag, ...values, '--cwd', project],
      })
      expect(result.error !== undefined || result.exitCode === 1).toBe(true)
      expect(await readdir(project)).toEqual([])
    }
  )
})

async function workspace(): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), 'granary-command-'))
  onTestFinished(() => rm(directory, { recursive: true, force: true }))
  return directory
}
