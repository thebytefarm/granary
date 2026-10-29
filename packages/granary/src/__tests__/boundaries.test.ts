import { execFile } from 'node:child_process'
import { readFile, readdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'
import { describe, expect, it } from 'vitest'

const execute = promisify(execFile)
const packages = new URL('../../../', import.meta.url)

describe('package boundaries', { timeout: 20_000 }, () => {
  it('keeps the full workspace dependency graph acyclic', async () => {
    const directories = ['core', 'sdk', 'plugins', 'cli', 'granary']
    const manifests = await Promise.all(
      directories.map(async (directory) =>
        JSON.parse(await readFile(new URL(`${directory}/package.json`, packages), 'utf8'))
      )
    )
    const graph = Object.fromEntries(
      manifests.map((manifest) => [
        manifest.name,
        Object.keys({ ...manifest.dependencies, ...manifest.devDependencies }).filter((name) =>
          manifests.some((candidate) => candidate.name === name)
        ),
      ])
    )
    function visit(name: string, ancestors: readonly string[]): void {
      expect(ancestors).not.toContain(name)
      for (const dependency of graph[name] ?? []) visit(dependency, [...ancestors, name])
    }
    for (const name of Object.keys(graph)) visit(name, [])
  })
  it('keeps engine and SDK dependency directions independent of prebuilt plugins and terminal code', async () => {
    for (const name of ['core', 'sdk']) {
      const directory = new URL(`${name}/src/`, packages)
      const files = await readdir(directory, { recursive: true })
      for (const path of files.filter(
        (path) => path.endsWith('.ts') && !path.split('/').includes('__tests__')
      )) {
        const source = await readFile(new URL(path, directory), 'utf8')
        expect(source).not.toMatch(/from ['"](?:@granary\/(?:plugins|cli|sdk)|granary-ai)(?:['"/])/)
        expect(source).not.toMatch(/from ['"](?:marxml|maltty|ink|react)['"/]/)
      }
      const manifest = JSON.parse(await readFile(new URL(`${name}/package.json`, packages), 'utf8'))
      expect(Object.keys(manifest.dependencies)).not.toContain('@granary/plugins')
      expect(Object.keys(manifest.dependencies)).not.toContain('@granary/cli')
    }
  })

  it('does not start terminal presentation when importing the SDK or CLI library', async () => {
    const sdk = fileURLToPath(new URL('../../dist/index.js', import.meta.url))
    const cli = fileURLToPath(new URL('../../../cli/dist/index.js', import.meta.url))
    for (const entry of [sdk, cli]) {
      const result = await execute(process.execPath, [
        '--input-type=module',
        '-e',
        `await import(${JSON.stringify(entry)})`,
      ])
      expect(result.stdout).toBe('')
      expect(result.stderr).toBe('')
    }
  })

  it('keeps terminal and standards implementations outside the SDK import graph', async () => {
    async function inspect(url: URL, ancestors: readonly string[]): Promise<void> {
      if (ancestors.includes(url.href)) return
      const source = await readFile(url, 'utf8')
      expect(source).not.toMatch(/(?:from\s*|import\s*\(\s*)['"](?:marxml|maltty|ink|react)['"/]/)
      expect(source).not.toContain('function parseStandards(')
      for (const imported of source.matchAll(
        /(?:from\s*|import\s*\(\s*)['"](\.\.?\/[^'"]+\.js)['"]/g
      )) {
        if (imported[1]) await inspect(new URL(imported[1], url), [...ancestors, url.href])
      }
    }
    await inspect(new URL('../../dist/index.js', import.meta.url), [])
  })

  it('ships the convenience executable and maintenance skills', async () => {
    const entry = fileURLToPath(new URL('../../dist/cli.js', import.meta.url))
    expect((await execute(process.execPath, [entry, '--help'])).stdout).toContain('granary')
    const manifest = JSON.parse(
      await readFile(new URL('../../package.json', import.meta.url), 'utf8')
    )
    expect((await execute(process.execPath, [entry, '--version'])).stdout.trim()).toBe(
      manifest.version
    )
    const skill = await readFile(
      new URL('../../skills/granary-author-pack/SKILL.md', import.meta.url),
      'utf8'
    )
    expect(skill).toContain('granary')
  })
})
