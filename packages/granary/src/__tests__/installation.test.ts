import { execFile } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { promisify } from 'node:util'

import { describe, expect, it, onTestFinished } from 'vitest'

const execute = promisify(execFile)
const entry = fileURLToPath(new URL('../../dist/cli.js', import.meta.url))

describe('built composition installation', { timeout: 20_000 }, () => {
  it('uses the Granary context and shared cache directories while keeping root metadata tracked', async () => {
    const project = await workspace()
    const content = '# Reference\n'
    const hash = createHash('sha256').update(content).digest('hex')
    await writeFile(join(project, 'README.md'), content)
    await writeFile(join(project, '.gitignore'), 'existing-rule\n')
    await writeFile(
      join(project, 'granary.json'),
      JSON.stringify({
        name: 'app',
        packs: { guide: { files: { include: ['README.md'] } } },
      })
    )
    await execute('git', ['-C', project, 'init', '--quiet'])
    await cli({ project, args: ['install'] })
    expect(await readFile(join(project, '.granary/context/guide/README.md'), 'utf8')).toBe(content)
    expect(await readFile(join(project, '.granary/cache/baselines', hash), 'utf8')).toBe(content)
    expect(await readFile(join(project, '.granary/.gitignore'), 'utf8')).toBe('*\n')
    expect(await readFile(join(project, '.gitignore'), 'utf8')).toBe('existing-rule\n')
    const lock = await readFile(join(project, 'granary-lock.json'), 'utf8')
    const ignored = await execute('git', [
      '-C',
      project,
      'check-ignore',
      '--no-index',
      '--',
      '.granary/context/guide/README.md',
      `.granary/cache/baselines/${hash}`,
      'granary.json',
      'granary-lock.json',
    ])
    expect(ignored.stdout.trim().split('\n')).toEqual([
      '.granary/context/guide/README.md',
      `.granary/cache/baselines/${hash}`,
    ])
    expect(await readdir(join(project, '.granary'))).toEqual(['.gitignore', 'cache', 'context'])
    await rm(join(project, '.granary'), { recursive: true })
    await cli({ project, args: ['install'] })
    expect(await readFile(join(project, '.granary/context/guide/README.md'), 'utf8')).toBe(content)
    expect(await readFile(join(project, '.granary/cache/baselines', hash), 'utf8')).toBe(content)
    expect(await readFile(join(project, 'granary-lock.json'), 'utf8')).toBe(lock)
  })

  it('shares cached baseline content across output overrides without ignoring adopted files', async () => {
    const project = await workspace()
    const content = '# Shared reference\n'
    const hash = createHash('sha256').update(content).digest('hex')
    await writeFile(join(project, 'README.md'), content)
    await writeFile(
      join(project, 'granary.json'),
      JSON.stringify({
        name: 'app',
        output: 'references',
        packs: {
          first: { files: { include: ['README.md'] }, output: 'first' },
          second: { files: { include: ['README.md'] }, output: 'second' },
        },
      })
    )
    await execute('git', ['-C', project, 'init', '--quiet'])
    await cli({ project, args: ['install'] })
    expect(await readdir(join(project, '.granary/cache/baselines'))).toEqual([hash])
    expect(await readdir(join(project, '.granary'))).toEqual(['.gitignore', 'cache'])
    expect(await readFile(join(project, 'references/first/README.md'), 'utf8')).toBe(content)
    expect(await readFile(join(project, 'references/second/README.md'), 'utf8')).toBe(content)
    const status = await execute('git', [
      '-C',
      project,
      'status',
      '--porcelain',
      '--untracked-files=all',
    ])
    expect(status.stdout).toContain('references/first/README.md')
    expect(status.stdout).not.toContain('.granary/')
  })

  it('preserves a custom Granary ignore file and fails before writing installation content', async () => {
    const project = await workspace()
    await mkdir(join(project, '.granary'))
    await writeFile(join(project, '.granary/.gitignore'), 'custom-rule\n')
    await writeFile(join(project, 'README.md'), '# Reference\n')
    const config = JSON.stringify({
      name: 'app',
      packs: { guide: { files: { include: ['README.md'] } } },
    })
    await writeFile(join(project, 'granary.json'), config)
    await expect(cli({ project, args: ['install'] })).rejects.toBeDefined()
    expect(await readdir(join(project, '.granary'))).toEqual(['.gitignore'])
    expect(await readFile(join(project, '.granary/.gitignore'), 'utf8')).toBe('custom-rule\n')
    expect(await readFile(join(project, 'granary.json'), 'utf8')).toBe(config)
    expect(await readdir(project)).not.toContain('granary-lock.json')
  })

  it('validates, installs, reviews updates, and restores manifestless source selections', async () => {
    const source = await workspace()
    await mkdir(join(source, 'docs'))
    await writeFile(join(source, 'docs/guide.mdx'), '# v1\n')
    const project = await workspace()
    await writeFile(
      join(project, 'granary.json'),
      JSON.stringify({
        name: 'app',
        output: 'reference',
        packs: { [`file:${source}`]: { files: { include: ['docs/**'] }, output: 'framework' } },
      })
    )
    await cli({ project, args: ['validate'] })
    await cli({ project, args: ['install'] })
    expect(await readFile(join(project, 'reference/framework/docs/guide.mdx'), 'utf8')).toBe(
      '# v1\n'
    )
    await writeFile(join(source, 'docs/guide.mdx'), '# v2\n')
    const review = await cli({ project, args: ['update'] })
    await writeFile(join(project, 'review.json'), review)
    await cli({ project, args: ['update', '--apply', 'review.json'] })
    expect(await readFile(join(project, 'reference/framework/docs/guide.mdx'), 'utf8')).toBe(
      '# v2\n'
    )
    await rm(join(project, 'reference/framework/docs/guide.mdx'))
    await cli({ project, args: ['install'] })
    expect(await readFile(join(project, 'reference/framework/docs/guide.mdx'), 'utf8')).toBe(
      '# v2\n'
    )
  })

  it('adds a manifestless Git source using an explicit branch without writing legacy dependencies', async () => {
    const source = await workspace()
    await writeFile(join(source, 'README.md'), '# Source\n')
    await execute('git', ['-C', source, 'init', '-b', 'main'])
    await execute('git', ['-C', source, 'add', '.'])
    await execute('git', [
      '-C',
      source,
      '-c',
      'user.name=Test',
      '-c',
      'user.email=test@example.com',
      'commit',
      '-m',
      'fixture',
    ])
    const project = await workspace()
    const locator = `git+${pathToFileURL(source).href}`
    await cli({ project, args: ['add', locator, '--branch', 'main', '--output', 'adopted'] })
    const document: unknown = JSON.parse(await readFile(join(project, 'granary.json'), 'utf8'))
    expect(document).toMatchObject({
      name: 'project',
      packs: { [locator]: { branch: 'main', output: 'adopted' } },
    })
    expect(document).not.toHaveProperty('dependencies')
    expect(await readFile(join(project, 'adopted/README.md'), 'utf8')).toBe('# Source\n')
  })
})

async function workspace(): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), 'granary-composition-cli-'))
  onTestFinished(() => rm(directory, { recursive: true, force: true }))
  return directory
}

type CliParams = { readonly project: string; readonly args: readonly string[] }

async function cli({ project, args }: CliParams): Promise<string> {
  const result = await execute(process.execPath, [entry, ...args, '--cwd', project])
  return result.stdout
}
