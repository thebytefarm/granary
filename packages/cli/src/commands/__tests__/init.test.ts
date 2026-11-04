import { glob, mkdir, mkdtemp, readFile, readdir, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { mockLog, mockPrompts, runHandler } from 'maltty/test'
import { describe, expect, it, onTestFinished, vi } from 'vitest'

import { createInitCommand } from '#/commands/init.ts'

describe('guided project initialization', () => {
  const cmd = createInitCommand({ isInteractive: () => true })

  it('offers detected tool packs first and writes nothing before confirmation', async () => {
    const project = await workspace()
    await writeFile(
      join(project, 'package.json'),
      JSON.stringify({ dependencies: { next: '^16.0.0', react: '^19.0.0', zod: '^4.0.0' } })
    )
    await writeFile(join(project, 'tsconfig.json'), '{}')
    const prompts = mockPrompts({
      text: ['app'],
      select: ['prebuilt'],
      multiselect: [['nextjs', 'react', 'zod']],
      confirm: [false],
    })
    const result = await runHandler({ cmd, overrides: { args: { cwd: project }, prompts } })
    expect(result.error).toBeUndefined()
    expect(prompts.multiselect).toHaveBeenCalledWith(
      expect.objectContaining({
        initialValues: ['nextjs', 'react', 'zod', 'recommended-typescript'],
        options: expect.arrayContaining([
          expect.objectContaining({ value: 'nextjs', label: 'Next.js docs' }),
          expect.objectContaining({
            value: 'recommended-typescript',
            label: 'Bytefarm TypeScript standards',
          }),
        ]),
      })
    )
    expect(await readdir(project)).toEqual(['package.json', 'tsconfig.json'])
  })

  it('preselects detected language sets and installs only the confirmed selection', async () => {
    const project = await workspace()
    await writeFile(join(project, 'tsconfig.json'), '{}')
    const prompts = mockPrompts({
      text: ['app'],
      select: ['prebuilt'],
      multiselect: [['recommended-typescript', 'recommended-rust']],
      confirm: [true],
    })
    const result = await runHandler({ cmd, overrides: { args: { cwd: project }, prompts } })
    expect(result.error).toBeUndefined()
    expect(prompts.multiselect).toHaveBeenCalledWith(
      expect.objectContaining({ initialValues: ['recommended-typescript'], required: false })
    )
    const lock = await readFile(join(project, 'granary-lock.json'), 'utf8')
    expect(lock).toContain('"provider": "builtin"')
    expect(lock).not.toContain('node_modules')
    expect(
      await readFile(
        join(project, '.granary/context/docs/bytefarm/engineering/0.1.0/README.md'),
        'utf8'
      )
    ).toContain('Functional engineering')
  })

  it('allows clearing all recommendations without installing anything', async () => {
    const project = await workspace()
    const prompts = mockPrompts({
      text: ['app'],
      select: ['prebuilt'],
      multiselect: [[]],
      confirm: [true],
    })
    const result = await runHandler({ cmd, overrides: { args: { cwd: project }, prompts } })
    expect(result.error).toBeUndefined()
    expect(await readdir(project)).toEqual(['granary.json'])
  })

  it('does not install detected packs with --yes unless explicitly selected', async () => {
    const project = await workspace()
    await writeFile(join(project, 'tsconfig.json'), '{}')
    const result = await runHandler({ cmd, overrides: { args: { cwd: project, yes: true } } })
    expect(result.error).toBeUndefined()
    expect(await readdir(project)).toEqual(['granary.json', 'tsconfig.json'])
  })

  it('collects a project name and confirms an empty scaffold through maltty', async () => {
    const project = await workspace()
    const prompts = mockPrompts({ text: ['my-app'], select: ['empty'], confirm: [true] })
    const result = await runHandler({ cmd, overrides: { args: { cwd: project }, prompts } })
    expect(result.error).toBeUndefined()
    expect(await manifest(project)).toEqual({ name: 'my-app', packs: {} })
    expect(await readdir(project)).toEqual(['granary.json'])
    expect(prompts.text).toHaveBeenCalledWith(expect.objectContaining({ message: 'Project name' }))
    expect(prompts.confirm).toHaveBeenCalledOnce()
  })

  it('installs the selected local source with the existing adoption pipeline', async () => {
    const project = await workspace()
    const source = await workspace()
    const log = mockLog()
    await writeFile(join(source, 'README.md'), '# Team rules\n')
    const prompts = mockPrompts({ text: ['team-app', source], select: ['source'], confirm: [true] })
    const result = await runHandler({ cmd, overrides: { args: { cwd: project }, prompts, log } })
    expect(result.error).toBeUndefined()
    expect(await manifest(project)).toMatchObject({ name: 'team-app' })
    const lock = await readFile(join(project, 'granary-lock.json'), 'utf8')
    expect(lock).toContain('README.md')
    expect(await readFile(join(project, 'AGENTS.md'), 'utf8')).toContain('<granary-context>')
    const installed = await Array.fromAsync(glob('.granary/context/**/README.md', { cwd: project }))
    expect(installed).toHaveLength(1)
    expect(await readFile(join(project, installed[0] ?? ''), 'utf8')).toBe('# Team rules\n')
    expect(log.info).toHaveBeenCalledWith('Installed context. 1 pack(s) locked.')
  })

  it('leaves no files when confirmation is declined', async () => {
    const project = await workspace()
    const log = mockLog()
    const prompts = mockPrompts({
      text: ['app', 'nextjs@16'],
      select: ['source'],
      confirm: [false],
    })
    const result = await runHandler({ cmd, overrides: { args: { cwd: project }, prompts, log } })
    expect(result.error).toBeUndefined()
    expect(await readdir(project)).toEqual([])
    expect(log.info).toHaveBeenCalledWith('Setup cancelled. No files changed.')
  })

  it('preserves a configuration created while setup is prompting', async () => {
    const project = await workspace()
    const prompts = mockPrompts({ text: ['app'], select: ['empty'] })
    vi.mocked(prompts.confirm).mockImplementation(async () => {
      await writeFile(join(project, 'granary.json'), 'concurrent user work')
      return true
    })
    const result = await runHandler({ cmd, overrides: { args: { cwd: project }, prompts } })
    expect(result.error).toBeInstanceOf(Error)
    expect(await readFile(join(project, 'granary.json'), 'utf8')).toBe('concurrent user work')
  })

  it('leaves no files when the prompt adapter rejects cancellation', async () => {
    const project = await workspace()
    const prompts = mockPrompts({ text: ['app'], select: ['empty'] })
    vi.mocked(prompts.confirm).mockRejectedValue(new Error('Prompt cancelled by user'))
    const result = await runHandler({ cmd, overrides: { args: { cwd: project }, prompts } })
    expect(result.error?.message).toBe('Prompt cancelled by user')
    expect(await readdir(project)).toEqual([])
  })

  it('rejects invalid framework selection before writing configuration', async () => {
    const project = await workspace()
    const prompts = mockPrompts({
      text: ['app', 'nextjs@latest'],
      select: ['source'],
      confirm: [true],
    })
    const result = await runHandler({ cmd, overrides: { args: { cwd: project }, prompts } })
    expect(result.error).toBeInstanceOf(Error)
    expect(await readdir(project)).toEqual([])
  })

  it('retains the scaffold and explains recovery when installation fails', async () => {
    const project = await workspace()
    const prompts = mockPrompts({
      text: ['app', './missing-source'],
      select: ['source'],
      confirm: [true],
    })
    const result = await runHandler({ cmd, overrides: { args: { cwd: project }, prompts } })
    expect(result.error?.message).toContain('Created granary.json, but installation failed:')
    expect(await manifest(project)).toEqual({ name: 'app', packs: {} })
    expect(await readdir(project)).toEqual(['granary.json'])
  })

  it.each(['granary.json', 'granary-lock.json'])(
    'refuses existing %s before prompting',
    async (name) => {
      const project = await workspace()
      await writeFile(join(project, name), '{user state')
      const prompts = mockPrompts()
      const result = await runHandler({ cmd, overrides: { args: { cwd: project }, prompts } })
      expect(result.error?.message).toContain(`${name} already exists`)
      expect(prompts.text).not.toHaveBeenCalled()
      expect(await readFile(join(project, name), 'utf8')).toBe('{user state')
    }
  )

  it('refuses dangling configuration symlinks without following them', async () => {
    const project = await workspace()
    const target = join(project, 'missing.json')
    await symlink(target, join(project, 'granary.json'))
    const result = await runHandler({ cmd, overrides: { args: { cwd: project, yes: true } } })
    expect(result.error?.message).toContain('granary.json already exists')
    expect(await readdir(project)).toEqual(['granary.json'])
  })

  it('requires --yes outside interactive terminals rather than waiting for input', async () => {
    const project = await workspace()
    const prompts = mockPrompts()
    const result = await runHandler({
      cmd: createInitCommand({ isInteractive: () => false }),
      overrides: { args: { cwd: project }, prompts },
    })
    expect(result.error?.message).toContain('granary init --yes')
    expect(prompts.text).not.toHaveBeenCalled()
    expect(await readdir(project)).toEqual([])
  })

  it('creates a named scaffold without invoking prompts with --yes', async () => {
    const project = await workspace()
    const prompts = mockPrompts()
    const result = await runHandler({
      cmd,
      overrides: { args: { cwd: project, yes: true, name: 'my-app' }, prompts },
    })
    expect(result.error).toBeUndefined()
    expect(await manifest(project)).toEqual({ name: 'my-app', packs: {} })
    expect(prompts.text).not.toHaveBeenCalled()
  })

  it('prefills the detected package name while allowing edits during project setup', async () => {
    const project = await workspace()
    await writeFile(join(project, 'package.json'), JSON.stringify({ name: '@acme/my.app' }))
    const prompts = mockPrompts({ text: ['edited-project'], select: ['empty'], confirm: [true] })
    const result = await runHandler({ cmd, overrides: { args: { cwd: project }, prompts } })
    expect(result.error).toBeUndefined()
    expect(prompts.text).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Project name', initialValue: 'acme/my-app' })
    )
    expect(await manifest(project)).toEqual({ name: 'edited-project', packs: {} })
  })

  it.each([
    ['package name', JSON.stringify({ name: 'named-project' }), 'named-project'],
    ['scoped package name', JSON.stringify({ name: '@acme/web' }), 'acme/web'],
    ['missing name', '{}', 'project-directory'],
    ['malformed metadata', '{invalid', 'project-directory'],
    ['invalid name', JSON.stringify({ name: '___' }), 'project-directory'],
  ])('detects the scaffold name from %s', async (_, metadata, name) => {
    const project = join(await workspace(), 'Project Directory')
    await mkdir(project)
    await writeFile(join(project, 'package.json'), metadata)
    const result = await runHandler({ cmd, overrides: { args: { cwd: project, yes: true } } })
    expect(result.error).toBeUndefined()
    expect(await manifest(project)).toEqual({ name, packs: {} })
    expect(await readFile(join(project, 'package.json'), 'utf8')).toBe(metadata)
  })

  it('lets --name override detected package metadata', async () => {
    const project = await workspace()
    await writeFile(join(project, 'package.json'), JSON.stringify({ name: 'detected' }))
    const result = await runHandler({
      cmd,
      overrides: { args: { cwd: project, yes: true, name: 'explicit' } },
    })
    expect(result.error).toBeUndefined()
    expect(await manifest(project)).toEqual({ name: 'explicit', packs: {} })
  })

  it('validates explicitly supplied scaffold names before writing', async () => {
    const project = await workspace()
    const result = await runHandler({
      cmd,
      overrides: { args: { cwd: project, yes: true, name: '../INVALID' } },
    })
    expect(result.error).toBeInstanceOf(Error)
    expect(await readdir(project)).toEqual([])
  })

  it.each([
    ['My Project', 'my-project'],
    ['___', 'project'],
  ])('defaults the name from directory %s to %s', async (directory, name) => {
    const parent = await workspace()
    const project = join(parent, directory)
    await mkdir(project)
    const result = await runHandler({ cmd, overrides: { args: { cwd: project, yes: true } } })
    expect(result.error).toBeUndefined()
    expect(await manifest(project)).toEqual({ name, packs: {} })
  })
})

async function workspace(): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), 'granary-init-'))
  onTestFinished(() => rm(directory, { recursive: true, force: true }))
  return directory
}

async function manifest(project: string): Promise<unknown> {
  return JSON.parse(await readFile(join(project, 'granary.json'), 'utf8'))
}
