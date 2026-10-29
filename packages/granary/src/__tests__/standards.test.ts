import { execFile } from 'node:child_process'
import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'

import { describe, expect, it, onTestFinished } from 'vitest'

const execute = promisify(execFile)
const entry = fileURLToPath(new URL('../../dist/cli.js', import.meta.url))
const fixture = fileURLToPath(
  new URL('../../../plugins/src/standards/__fixtures__/standards-pack/', import.meta.url)
)

describe('built standards commands', { timeout: 15_000 }, () => {
  it('exports complete Markdown and Greptile rules with effective enforcement and provenance', async () => {
    const project = await temporaryProject()
    const source = await standardsSource()
    for (const format of ['markdown', 'greptile']) {
      const result = await execute(process.execPath, [
        entry,
        'standards',
        '--source',
        source,
        '--format',
        format,
        '--cwd',
        project,
      ])
      expect(result.stdout).toContain('example/standards#immutable-values/preserve-inputs')
      expect(result.stdout).toContain('```ts')
      expect(result.stdout).toContain('Zoë')
      expect(result.stdout).toContain('Effective consumer enforcement')
      expect(result.stdout).toContain('Content hash:')
    }
  })

  it('prepares and applies an update review through the distributed executable', async () => {
    const project = await temporaryProject()
    const candidate = join(project, 'candidate')
    await cp(await standardsSource(), candidate, { recursive: true })
    await execute(process.execPath, [
      entry,
      'add',
      candidate,
      '--output',
      'reference',
      '--cwd',
      project,
    ])
    const file = join(candidate, 'README.md')
    await writeFile(file, `${await readFile(file, 'utf8')}\nCandidate update.\n`)
    const prepared = await execute(process.execPath, [entry, 'update', '--cwd', project])
    expect(JSON.parse(prepared.stdout)).toMatchObject({
      schemaVersion: 1,
      packs: [{ name: expect.any(String) }],
    })
    await writeFile(join(project, 'review.json'), prepared.stdout)
    const applied = await execute(process.execPath, [
      entry,
      'update',
      '--apply',
      'review.json',
      '--cwd',
      project,
    ])
    expect(JSON.parse(applied.stdout)).toMatchObject({
      schemaVersion: 1,
      packs: [{ request: { label: `file:${candidate}` } }],
    })
    expect(await readFile(join(project, 'reference/README.md'), 'utf8')).toContain(
      'Candidate update.'
    )
    await execute(process.execPath, [entry, 'install', '--cwd', project])
  })
  it('loads the native parser from the distributed CLI and emits unadorned JSON', async () => {
    const project = await temporaryProject()
    const source = await standardsSource()
    const { stdout } = await execute(process.execPath, [
      entry,
      'standards',
      '--source',
      source,
      '--cwd',
      project,
    ])
    expect(JSON.parse(stdout)).toMatchObject({
      schemaVersion: 1,
      standards: [{ id: 'immutable-values', rules: [{ level: 'MUST NOT' }, { level: 'MUST' }] }],
    })
  })

  it('extracts installed standards, initializes enforcement, and previews upstream differences without replacing local files', async () => {
    const project = await temporaryProject()
    const source = await standardsSource()
    await execute(process.execPath, [
      entry,
      'add',
      source,
      '--output',
      'reference',
      '--cwd',
      project,
    ])
    await execute(process.execPath, [entry, 'standards', '--setup', '--cwd', project])
    const config = await readFile(join(project, 'granary.json'), 'utf8')
    expect(JSON.parse(config)).toHaveProperty('plugins.standards.default', '[review]')
    const file = join(project, 'reference/immutability.md')
    const original = await readFile(file, 'utf8')
    const customized = original.replace(
      'function arguments.',
      'function arguments or project state.'
    )
    await writeFile(file, customized)
    const { stdout } = await execute(process.execPath, [entry, 'standards', '--cwd', project])
    expect(JSON.parse(stdout)).toHaveProperty('standards.0.provenance.customized', true)
    const preview = await execute(process.execPath, [entry, 'update', '--cwd', project])
    expect(JSON.parse(preview.stdout)).toMatchObject({
      packs: [
        {
          files: expect.arrayContaining([
            expect.objectContaining({ path: 'docs/immutability.md', kind: 'local' }),
          ]),
        },
      ],
    })
    expect(await readFile(file, 'utf8')).toBe(customized)
    expect(await readFile(join(project, 'granary.json'), 'utf8')).toBe(config)
  })
})

async function standardsSource(): Promise<string> {
  const source = await temporaryProject()
  await cp(fixture, source, { recursive: true })
  await writeFile(
    join(source, 'granary.json'),
    JSON.stringify({
      name: 'example/standards',
      version: '0.1.0',
      files: { include: ['*.md'] },
      documents: { 'immutability.md': 'standards' },
    })
  )
  return source
}

async function temporaryProject(): Promise<string> {
  const path = await mkdtemp(join(tmpdir(), 'granary-standards-cli-'))
  onTestFinished(() => rm(path, { recursive: true, force: true }))
  return path
}
