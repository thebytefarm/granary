import { execFile } from 'node:child_process'
import { access, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'

import { describe, expect, it, onTestFinished } from 'vitest'

import packageJson from '../package.json' with { type: 'json' }

const execute = promisify(execFile)
const entry = fileURLToPath(new URL('../dist/index.js', import.meta.url))
const legacyBundle = fileURLToPath(
  new URL('../../core/src/workflows/fixtures/legacy-bundle/', import.meta.url)
)

describe('built Granary CLI', { timeout: 15_000 }, () => {
  it('loads maltty and exposes command help', async () => {
    const { stdout } = await execute(process.execPath, [entry, '--help'])

    expect(stdout).toContain('granary')
    expect(stdout).toContain('about')
  })

  it('reports the package version', async () => {
    const { stdout } = await execute(process.execPath, [entry, '--version'])

    expect(stdout.trim()).toBe(packageJson.version)
  })

  it('runs the bundled about command', async () => {
    const { stdout, stderr } = await execute(process.execPath, [entry, 'about'])

    expect(stdout + stderr).toContain('Install local and Git packs')
  })

  it('validates the checked-in JSON standards pack through maltty', async () => {
    const directory = fileURLToPath(new URL('../../../', import.meta.url))
    const { stdout, stderr } = await execute(process.execPath, [
      entry,
      'validate',
      '--cwd',
      directory,
    ])

    expect(stdout + stderr).toContain('Pack manifest is valid.')
  })

  it('rejects invalid manifest fields with a nonzero exit status', async () => {
    const directory = await createDirectory()
    await writeFile(join(directory, 'granary.json'), JSON.stringify({ name: 'broken' }))

    await expect(
      execute(process.execPath, [entry, 'validate', '--cwd', directory])
    ).rejects.toMatchObject({
      code: 1,
    })
  })

  it('rejects malformed JSON instead of reporting success', async () => {
    const directory = await createDirectory()
    await writeFile(join(directory, 'granary.json'), '{invalid')

    await expect(
      execute(process.execPath, [entry, 'validate', '--cwd', directory])
    ).rejects.toMatchObject({
      code: 1,
    })
  })

  it('rejects a directory without a manifest', async () => {
    const directory = await createDirectory()

    await expect(
      execute(process.execPath, [entry, 'validate', '--cwd', directory])
    ).rejects.toMatchObject({
      code: 1,
    })
  })

  it('adds, lists, and restores a legacy bundle through the distributed executable', async () => {
    const directory = await createDirectory()
    const source = legacyBundle
    const added = await execute(process.execPath, [
      entry,
      'add',
      source,
      '--content',
      'docs',
      '--output',
      'reference',
      '--cwd',
      directory,
    ])
    expect(added.stdout + added.stderr).toContain('Installed context.')
    expect(
      await readFile(
        join(directory, 'reference/docs/example/legacy-bundle/0.1.0/README.md'),
        'utf8'
      )
    ).toContain('Legacy bundle fixture')
    const listed = await execute(process.execPath, [entry, 'list', '--cwd', directory])
    expect(listed.stdout + listed.stderr).toContain('example/legacy-bundle@0.1.0')
    await rm(join(directory, 'reference'), { recursive: true })
    const restored = await execute(process.execPath, [entry, 'install', '--cwd', directory])
    expect(restored.stdout + restored.stderr).toContain('Restored 1 locked pack(s).')
    expect(await readFile(join(directory, 'reference/INDEX.md'), 'utf8')).toContain('README.md')
  })

  it('lists source packs without writing consumer files', async () => {
    const directory = await createDirectory()
    const source = fileURLToPath(new URL('../../../', import.meta.url))
    const result = await execute(process.execPath, [
      entry,
      'add',
      source,
      '--list',
      '--cwd',
      directory,
    ])
    expect(result.stdout + result.stderr).toContain('bytefarm/recommended-typescript')
    await expect(access(join(directory, 'granary.config.json'))).rejects.toMatchObject({
      code: 'ENOENT',
    })
  })

  it('validates, installs, and restores an independent pack without the root catalog', async () => {
    const directory = await createDirectory()
    const source = fileURLToPath(new URL('../../../packs/rust/', import.meta.url))
    const validated = await execute(process.execPath, [entry, 'validate', '--cwd', source])
    expect(validated.stdout + validated.stderr).toContain('Pack manifest is valid.')
    await execute(process.execPath, [entry, 'add', source, '--cwd', directory])
    const document = JSON.parse(await readFile(join(directory, 'granary.json'), 'utf8'))
    expect(Object.keys(document.dependencies)).toEqual(['bytefarm/rust-functional'])
    await rm(join(directory, '.context'), { recursive: true })
    const restored = await execute(process.execPath, [entry, 'install', '--cwd', directory])
    expect(restored.stdout + restored.stderr).toContain('Restored 1 locked pack(s).')
    expect(
      await readFile(
        join(directory, '.context/docs/bytefarm/rust-functional/0.1.0/README.md'),
        'utf8'
      )
    ).toContain('Functional Rust')
  })

  it('installs and restores all recommended language presets through the distributed executable', async () => {
    const directory = await createDirectory()
    const source = fileURLToPath(new URL('../../../', import.meta.url))
    const installed = await execute(process.execPath, [
      entry,
      'add',
      source,
      '--pack',
      'recommended-typescript',
      'recommended-rust',
      'recommended-python',
      '--cwd',
      directory,
    ])
    expect(installed.stdout + installed.stderr).toContain('7 pack(s) locked')
    expect(installed.stdout + installed.stderr).toContain('3 composite(s) recorded')
    const listed = await execute(process.execPath, [entry, 'list', '--cwd', directory])
    expect(listed.stdout + listed.stderr).toContain('recommended-python@0.1.0')
    expect(listed.stdout + listed.stderr).toContain('python-functional@0.1.0')
    await rm(join(directory, '.context'), { recursive: true })
    const restored = await execute(process.execPath, [entry, 'install', '--cwd', directory])
    expect(restored.stdout + restored.stderr).toContain('Restored 7 locked pack(s)')
    expect(await readFile(join(directory, '.context/INDEX.md'), 'utf8')).toContain(
      '## Recommended sets'
    )
  })

  it('rejects malformed consumer config instead of replacing it during add', async () => {
    const directory = await createDirectory()
    const source = legacyBundle
    await writeFile(join(directory, 'granary.config.json'), '{invalid')
    await expect(
      execute(process.execPath, [entry, 'add', source, '--cwd', directory])
    ).rejects.toMatchObject({ code: 1 })
    expect(await readFile(join(directory, 'granary.config.json'), 'utf8')).toBe('{invalid')
  })

  it.each([
    { extension: 'ts', content: 'export default { output: "other", packs: [] }\n' },
    { extension: 'yaml', content: 'output: other\npacks: []\n' },
    { extension: 'jsonc', content: '{"output":"other","packs":[]}\n' },
  ])(
    'rejects competing $extension consumer configuration before replacing JSON intent',
    async ({ extension, content }) => {
      const directory = await createDirectory()
      const source = legacyBundle
      const original = JSON.stringify({ output: 'original', packs: [] })
      await writeFile(join(directory, 'granary.config.json'), original)
      await writeFile(join(directory, `granary.config.${extension}`), content)
      await expect(
        execute(process.execPath, [entry, 'add', source, '--cwd', directory])
      ).rejects.toMatchObject({ code: 1 })
      expect(await readFile(join(directory, 'granary.config.json'), 'utf8')).toBe(original)
      await expect(access(join(directory, 'granary-lock.json'))).rejects.toMatchObject({
        code: 'ENOENT',
      })
    }
  )

  it('requires existing consumer intent for locked installation', async () => {
    const directory = await createDirectory()
    await expect(
      execute(process.execPath, [entry, 'install', '--cwd', directory])
    ).rejects.toMatchObject({ code: 1 })
    await expect(access(join(directory, 'granary.config.json'))).rejects.toMatchObject({
      code: 'ENOENT',
    })
  })

  it('rejects malformed lock metadata when listing recorded packs', async () => {
    const directory = await createDirectory()
    await writeFile(join(directory, 'granary-lock.json'), '{invalid')
    await expect(
      execute(process.execPath, [entry, 'list', '--cwd', directory])
    ).rejects.toMatchObject({ code: 1 })
  })

  it('rejects Git ref options for local sources before writing consumer files', async () => {
    const directory = await createDirectory()
    const source = legacyBundle
    await expect(
      execute(process.execPath, [entry, 'add', source, '--ref', 'main', '--cwd', directory])
    ).rejects.toMatchObject({ code: 1 })
    await expect(access(join(directory, 'granary.config.json'))).rejects.toMatchObject({
      code: 'ENOENT',
    })
  })

  it('preserves provider declarations while adding concise dependencies to a structured manifest', async () => {
    const directory = await createDirectory()
    const source = fileURLToPath(new URL('../../../', import.meta.url))
    const document = {
      schemaVersion: 1,
      packs: {
        'example/local': {
          version: '0.1.0',
          description: 'Local provider',
          path: '.',
          entry: 'README.md',
          files: ['README.md'],
        },
      },
    }
    await writeFile(join(directory, 'granary.json'), JSON.stringify(document))
    await writeFile(join(directory, 'README.md'), '# Local provider\n')
    await execute(process.execPath, [
      entry,
      'add',
      `file:${source}`,
      '--pack',
      'recommended-typescript',
      '--install-dir',
      'reference',
      '--cwd',
      directory,
    ])
    const next = JSON.parse(await readFile(join(directory, 'granary.json'), 'utf8'))
    expect(next.packs).toEqual(document.packs)
    expect(Object.keys(next.dependencies)).toEqual(['bytefarm/recommended-typescript'])
    expect(next.dependencies['bytefarm/recommended-typescript'].installDir).toBe('reference')
    await expect(access(join(directory, 'granary.config.json'))).rejects.toMatchObject({
      code: 'ENOENT',
    })
    await rm(join(directory, 'reference'), { recursive: true })
    await execute(process.execPath, [entry, 'install', '--cwd', directory])
    expect(await readFile(join(directory, 'reference/INDEX.md'), 'utf8')).toContain(
      'typescript-functional'
    )
  })

  it('rejects competing structured and legacy consumer intent', async () => {
    const directory = await createDirectory()
    await writeFile(
      join(directory, 'granary.json'),
      JSON.stringify({ schemaVersion: 1, dependencies: { 'example/rules': { source: 'file:.' } } })
    )
    await writeFile(
      join(directory, 'granary.config.json'),
      JSON.stringify({ output: '.context', packs: [] })
    )
    await expect(
      execute(process.execPath, [entry, 'install', '--cwd', directory])
    ).rejects.toMatchObject({ code: 1 })
    await expect(access(join(directory, 'granary-lock.json'))).rejects.toMatchObject({
      code: 'ENOENT',
    })
  })

  it('honors dashed package-version options when selecting a structured composite', async () => {
    const directory = await createDirectory()
    const source = fileURLToPath(new URL('../../../', import.meta.url))
    await expect(
      execute(process.execPath, [
        entry,
        'add',
        source,
        '--pack',
        'recommended-typescript',
        '--package-version',
        '9.0.0',
        '--cwd',
        directory,
      ])
    ).rejects.toMatchObject({ code: 1 })
    await expect(access(join(directory, 'granary-lock.json'))).rejects.toMatchObject({
      code: 'ENOENT',
    })
  })
})

async function createDirectory(): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), 'granary-manifest-'))
  onTestFinished(() => rm(directory, { recursive: true, force: true }))
  return directory
}
