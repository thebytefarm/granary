import { execFile } from 'node:child_process'
import { glob, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'

import { attemptAsync, isErr } from 'massaman/control'
import { describe, expect, it, onTestFinished } from 'vitest'

import { mapLimited } from '#/__tests__/support.ts'
import { createStandardsClient } from '#/standards/client.ts'

const execute = promisify(execFile)
const standards = fileURLToPath(new URL('../../../../../packs/', import.meta.url))
const components = [
  'engineering',
  'git',
  'documentation',
  'agent-instructions',
  'typescript',
  'rust',
  'python',
]
const pythonAvailable = !isErr(await attemptAsync(() => execute('python3', ['--version'])))
const returnsAvailable = !isErr(
  await attemptAsync(() => execute('python3', ['-c', 'import returns']))
)
const mypyAvailable = !isErr(await attemptAsync(() => execute('python3', ['-c', 'import mypy'])))
const rustAvailable = !isErr(await attemptAsync(() => execute('rustc', ['--version'])))
const rustExamples = await readExamples({ component: 'rust', language: 'rust' })

describe('standards content contracts', { timeout: 15_000 }, () => {
  it('extracts every authored standard with review-only controls and preserves all code examples', async () => {
    await mapLimited({
      items: components,
      concurrency: 2,
      transform: async (component) => {
        const directory = join(standards, component)
        const result = await createStandardsClient({ project: directory, source: '.' }).toJSON()
        expect(result.error).toBeNull()
        if (isErr(result)) {
          return
        }
        const paths = await Array.fromAsync(glob('*.md', { cwd: directory }))
        const sourcePaths = paths.filter((path) => path !== 'README.md')
        expect(
          new Set(result.value.standards.map((standard) => standard.provenance.path)).size
        ).toBe(sourcePaths.length)
        expect(result.value.standards.length).toBeGreaterThanOrEqual(sourcePaths.length)
        for (const standard of result.value.standards) {
          expect(standard.why).not.toBe('')
          expect(standard.enforcementNotes).toContain('[review]')
          expect(standard.rules.length).toBeGreaterThan(0)
          for (const rule of standard.rules) {
            expect(rule.enforcement.markers).toEqual(['[review]'])
            expect(rule.effectiveEnforcement.markers).toEqual(['[review]'])
          }
        }
        for (const path of sourcePaths) {
          const page = await readFile(join(directory, path), 'utf8')
          const extracted = result.value.standards
            .filter((standard) => standard.provenance.path === path)
            .map((standard) => standard.markdown)
            .join('\n')
          for (const match of page.matchAll(/^(`{3,}|~{3,})[^\n]*\n[\s\S]*?^\1\s*$/gm)) {
            expect(extracted, `${component}/${path} complete example`).toContain(match[0])
          }
        }
      },
    })
  })
  it('gives every component standard accurate metadata and rationale, rules, and enforcement sections', async () => {
    await mapLimited({
      items: components,
      concurrency: 4,
      transform: async (component) => {
        const paths = await Array.fromAsync(glob('*.md', { cwd: join(standards, component) }))
        await mapLimited({
          items: paths.filter((path) => path !== 'README.md'),
          concurrency: 4,
          transform: async (path) => {
            const page = await readFile(join(standards, component, path), 'utf8')
            const title = page.match(/^title: (.+)$/m)?.[1]
            const description = page.match(/^description: '(.+)'$/m)?.[1]
            expect(title, `${component}/${path} title`).toBeDefined()
            expect(description, `${component}/${path} description`).toBeDefined()
            expect(
              description?.length,
              `${component}/${path} description length`
            ).toBeLessThanOrEqual(120)
            expect(page.match(/^# (.+)$/m)?.[1], `${component}/${path} heading`).toBe(title)
            expect(page, `${component}/${path} rationale`).toContain('### Why')
            expect(page, `${component}/${path} rules`).toContain('### Rules')
            expect(page, `${component}/${path} enforcement`).toContain('## Enforcement')
          },
        })
      },
    })
  })

  it('discovers every standalone Rust example', () => {
    expect(rustExamples).toHaveLength(3)
  })

  it.skipIf(!rustAvailable).each(rustExamples)(
    'compiles and runs Rust example $name',
    async (example) => {
      const directory = await createDirectory()
      const source = join(directory, `${example.name}.rs`)
      const binary = join(directory, example.name)
      await writeFile(source, example.code)
      await execute('rustc', ['--edition', '2024', '--test', source, '-o', binary], {
        timeout: 10_000,
      })
      const result = await execute(binary, [], { timeout: 2_000 })
      expect(result.stdout).toContain('1 passed')
    }
  )

  it.skipIf(!pythonAvailable)(
    'parses every Python example and rejects authored exception-control-flow syntax',
    async () => {
      const examples = await readExamples({ component: 'python', language: 'python' })
      expect(examples).toHaveLength(4)
      const directory = await createDirectory()
      await mapLimited({
        items: examples,
        concurrency: 2,
        transform: async (example) => {
          const source = join(directory, `${example.name}.py`)
          await writeFile(source, example.code)
          await execute('python3', [
            '-c',
            'import ast, pathlib, sys; tree = ast.parse(pathlib.Path(sys.argv[1]).read_text()); assert not any(isinstance(node, (ast.Raise, ast.Try, getattr(ast, "TryStar", ast.Try))) for node in ast.walk(tree))',
            source,
          ])
          if (!example.code.includes('from returns.')) {
            await execute('python3', [source])
          }
        },
      })
    }
  )

  it.skipIf(!returnsAvailable)(
    'executes Python Result examples with the real returns library',
    async () => {
      const examples = await readExamples({ component: 'python', language: 'python' })
      const directory = await createDirectory()
      await mapLimited({
        items: examples.filter((example) => example.code.includes('from returns.')),
        concurrency: 2,
        transform: async (example) => {
          const source = join(directory, `${example.name}.py`)
          await writeFile(source, example.code)
          await execute('python3', [source])
        },
      })
    }
  )

  it.skipIf(!returnsAvailable || !mypyAvailable)(
    'strictly typechecks Python examples with the returns plugin',
    async () => {
      const examples = await readExamples({ component: 'python', language: 'python' })
      const directory = await createDirectory()
      const config = join(directory, 'mypy.ini')
      await writeFile(
        config,
        '[mypy]\nstrict = True\nplugins = returns.contrib.mypy.returns_plugin\n'
      )
      const sources = await mapLimited({
        items: examples,
        concurrency: 2,
        transform: async (example) => {
          const source = join(directory, `${example.name.replaceAll('-', '_')}.py`)
          await writeFile(source, example.code)
          return source
        },
      })
      await execute('python3', [
        '-m',
        'mypy',
        '--config-file',
        config,
        '--cache-dir',
        join(directory, 'cache'),
        ...sources,
      ])
    }
  )
})

type ReadExamplesParams = { readonly component: string; readonly language: string }

async function readExamples({ component, language }: ReadExamplesParams) {
  const paths = await Array.fromAsync(glob('*.md', { cwd: join(standards, component) }))
  const pages = await mapLimited({
    items: paths,
    concurrency: 4,
    transform: async (path) => {
      const page = await readFile(join(standards, component, path), 'utf8')
      return [...page.matchAll(/^```([^\n]+)\n([\s\S]*?)^```\s*$/gm)]
        .filter((match) => match[1] === language)
        .flatMap((match, index) => {
          const code = match[2]
          if (!code) {
            return []
          }
          return [{ name: `${path.replace('.md', '')}-${index}`, code }]
        })
    },
  })
  return pages.flat()
}

async function createDirectory() {
  const directory = await mkdtemp(join(tmpdir(), 'granary-examples-'))
  onTestFinished(() => rm(directory, { recursive: true, force: true }))
  return directory
}
