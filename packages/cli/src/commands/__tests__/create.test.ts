import { mkdir, mkdtemp, readFile, readdir, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { mockLog, mockPrompts, runCommand, runHandler } from 'maltty/test'
import { describe, expect, it, onTestFinished, vi } from 'vitest'

import { granary } from '@granary/sdk'

import { createAuthoringCommand, create } from '#/commands/create.ts'

describe('reusable pack authoring', () => {
  const cmd = createAuthoringCommand({ isInteractive: () => true })

  it('authors an installable pack without registering or installing it in the project', async () => {
    const project = await workspace()
    const directory = join(project, 'reference')
    await mkdir(directory)
    await writeFile(join(directory, 'README.md'), '# Reference\n')
    await writeFile(join(directory, 'private.md'), '# Private\n')
    await writeFile(join(project, 'granary.json'), 'existing consumer config')
    const prompts = mockPrompts({
      text: ['team/reference', 'Team reference material', '0.1.0', '**/*.md', 'private.md'],
      confirm: [true],
    })
    const result = await runHandler({
      cmd,
      overrides: { args: { cwd: project, directory: 'reference' }, prompts },
    })
    expect(result.error).toBeUndefined()
    expect(await manifest(directory)).toEqual({
      name: 'team/reference',
      description: 'Team reference material',
      version: '0.1.0',
      files: { include: ['**/*.md'], exclude: ['private.md'] },
    })
    expect(await readFile(join(project, 'granary.json'), 'utf8')).toBe('existing consumer config')
    expect(await readdir(project)).toEqual(['granary.json', 'reference'])
    expect(await readdir(directory)).toEqual(['README.md', 'granary.json', 'private.md'])
    const consumer = await workspace()
    const adopted = await granary({ project: consumer }).packs.add({
      source: { provider: 'local', path: directory },
      output: 'reference',
    })
    expect(adopted.ok).toBe(true)
    expect(await readFile(join(consumer, 'reference/README.md'), 'utf8')).toBe('# Reference\n')
    expect(await readdir(join(consumer, 'reference'))).toEqual(['README.md'])
  })

  it('keeps pack identity independent of the enclosing npm package name', async () => {
    const project = await workspace()
    const directory = join(project, 'team-rules')
    await mkdir(directory)
    await writeFile(join(directory, 'package.json'), JSON.stringify({ name: 'unrelated-runtime' }))
    const prompts = mockPrompts({ text: ['team-rules', '', '', 'README.md', ''], confirm: [true] })
    const result = await runHandler({
      cmd,
      overrides: { args: { cwd: project, directory: 'team-rules' }, prompts },
    })
    expect(result.error).toBeUndefined()
    expect(prompts.text).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Pack identity', initialValue: 'team-rules' })
    )
    expect(await manifest(directory)).toEqual({
      name: 'team-rules',
      files: { include: ['README.md'], exclude: [] },
    })
  })

  it('supports unattended authoring with explicit metadata and multiple file globs', async () => {
    const directory = await workspace()
    const result = await runCommand({
      name: 'granary',
      commands: { create },
      args: [
        'create',
        directory,
        '--yes',
        '--name',
        'team/rules',
        '--pack-version',
        '2.0.0',
        '--description',
        'Rules',
        '--include',
        'README.md',
        'docs/**',
        '--exclude',
        '**/private/**',
      ],
    })
    expect(result.error).toBeUndefined()
    expect(result.exitCode ?? 0).toBe(0)
    expect(await manifest(directory)).toEqual({
      name: 'team/rules',
      description: 'Rules',
      version: '2.0.0',
      files: { include: ['README.md', 'docs/**'], exclude: ['**/private/**'] },
    })
    expect(await readdir(directory)).toEqual(['granary.json'])
  })

  it('never writes files when confirmation is declined', async () => {
    const directory = await workspace()
    const prompts = mockPrompts({ text: ['rules', '', '0.1.0', '**/*.md', ''], confirm: [false] })
    const result = await runHandler({ cmd, overrides: { args: { directory }, prompts } })
    expect(result.error).toBeUndefined()
    expect(await readdir(directory)).toEqual([])
  })

  it('applies safe Markdown defaults when no selection flags are supplied', async () => {
    const directory = join(await workspace(), 'team-rules')
    await mkdir(directory)
    const result = await runCommand({
      name: 'granary',
      commands: { create },
      args: ['create', directory, '--yes'],
    })
    expect(result.error).toBeUndefined()
    expect(result.exitCode ?? 0).toBe(0)
    expect(await manifest(directory)).toEqual({
      name: 'team-rules',
      version: '0.1.0',
      files: { include: ['**/*.md'] },
    })
  })

  it('preserves authored state when a prompt is cancelled', async () => {
    const directory = await workspace()
    const prompts = mockPrompts()
    vi.mocked(prompts.text).mockRejectedValue(new Error('Prompt cancelled by user'))
    const result = await runHandler({ cmd, overrides: { args: { directory }, prompts } })
    expect(result.error?.message).toContain('Prompt cancelled')
    expect(await readdir(directory)).toEqual([])
  })

  it.each(['granary.json', 'granary-lock.json'])(
    'refuses existing %s without prompting',
    async (filename) => {
      const directory = await workspace()
      await writeFile(join(directory, filename), 'original')
      const prompts = mockPrompts()
      const result = await runHandler({ cmd, overrides: { args: { directory }, prompts } })
      expect(result.error?.message).toContain(`${filename} already exists`)
      expect(prompts.text).not.toHaveBeenCalled()
      expect(await readFile(join(directory, filename), 'utf8')).toBe('original')
    }
  )

  it.each(['../secret.md', '/secret.md', '!private.md'])(
    'rejects unsafe include glob %s before writing',
    async (include) => {
      const directory = await workspace()
      const result = await runHandler({
        cmd,
        overrides: { args: { directory, yes: true, include: [include] } },
      })
      expect(result.error).toBeInstanceOf(Error)
      expect(await readdir(directory)).toEqual([])
    }
  )

  it('does not follow a symlink used as the authoring directory', async () => {
    const parent = await workspace()
    const directory = await workspace()
    const alias = join(parent, 'alias')
    await symlink(directory, alias)
    const result = await runHandler({ cmd, overrides: { args: { directory: alias, yes: true } } })
    expect(result.error?.message).toContain('existing directory')
    expect(await readdir(directory)).toEqual([])
  })

  it('does not overwrite a manifest created during prompts', async () => {
    const directory = await workspace()
    const prompts = mockPrompts({ text: ['rules', '', '0.1.0', '**/*.md', ''] })
    vi.mocked(prompts.confirm).mockImplementation(async () => {
      await writeFile(join(directory, 'granary.json'), 'concurrent author work')
      return true
    })
    const result = await runHandler({ cmd, overrides: { args: { directory }, prompts } })
    expect(result.error).toBeInstanceOf(Error)
    expect(await readFile(join(directory, 'granary.json'), 'utf8')).toBe('concurrent author work')
  })

  it('requires --yes without a terminal and never invokes prompts', async () => {
    const directory = await workspace()
    const prompts = mockPrompts()
    const log = mockLog()
    const result = await runHandler({
      cmd: createAuthoringCommand({ isInteractive: () => false }),
      overrides: { args: { directory }, prompts, log },
    })
    expect(result.error?.message).toContain('--yes')
    expect(prompts.text).not.toHaveBeenCalled()
    expect(await readdir(directory)).toEqual([])
  })

  it('requires an explicit, existing target directory', async () => {
    const project = await workspace()
    const missing = await runHandler({ cmd, overrides: { args: { cwd: project, yes: true } } })
    expect(missing.error).toBeInstanceOf(Error)
    const nonexistent = await runHandler({
      cmd,
      overrides: { args: { cwd: project, directory: 'missing', yes: true } },
    })
    expect(nonexistent.error).toBeInstanceOf(Error)
    expect(await readdir(project)).toEqual([])
  })
})

async function workspace(): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), 'granary-pack-create-'))
  onTestFinished(() => rm(directory, { recursive: true, force: true }))
  return directory
}

async function manifest(directory: string): Promise<unknown> {
  return JSON.parse(await readFile(join(directory, 'granary.json'), 'utf8'))
}
