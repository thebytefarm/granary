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
})

async function workspace(): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), 'granary-command-'))
  onTestFinished(() => rm(directory, { recursive: true, force: true }))
  return directory
}
