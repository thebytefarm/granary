import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { describe, expect, expectTypeOf, it, onTestFinished } from 'vitest'

import { granary } from 'granary-ai'
import { createGranary, definePlugin } from 'granary-ai/core'
import type { Outcome } from 'granary-ai'
import { standardsPlugin } from 'granary-ai/plugins/standards'
import { defaultPlugins } from 'granary-ai/plugins'

describe('built package SDK', () => {
  it('works without arguments and composes the recommended plugins only on request', () => {
    expect('standards' in granary()).toBe(false)
    expectTypeOf(granary({ plugins: defaultPlugins() }).standards.toJSON).toBeFunction()
    expect('standards' in granary({ plugins: [] })).toBe(false)
  })
  it('loads through package exports without executing CLI startup and composes typed plugins', async () => {
    const project = await mkdtemp(join(tmpdir(), 'granary-sdk-'))
    onTestFinished(() => rm(project, { recursive: true, force: true }))
    await writeFile(join(project, 'example.md'), '# SDK\n')
    const plugin = definePlugin((options: { readonly path: string }) => ({
      name: 'example',
      setup({ content }) {
        return { read: () => content.text({ path: options.path }) }
      },
    }))
    const client = granary({
      project,
      plugins: [standardsPlugin(), plugin({ path: 'example.md' })],
    })
    expectTypeOf(client.example.read).toBeFunction()
    const read = await client.example.read()
    expectTypeOf(read).toEqualTypeOf<Outcome<string, Error & { readonly kind: 'io' | 'invalid' }>>()
    expect(read.ok).toBe(true)
    if (read.ok) {
      expect(read.value).toBe('# SDK\n')
    }
    expect(typeof client.standards.toMarkdown).toBe('function')
    expect(() =>
      createGranary({ project, plugins: [standardsPlugin(), standardsPlugin()] })
    ).toThrowError(expect.objectContaining({ kind: 'invalid' }))
  })

  it('ships self-contained declarations rather than references to the private core workspace', async () => {
    const directory = new URL('../../dist/', import.meta.url)
    const files = await readdir(directory, { recursive: true })
    const declarations = await Promise.all(
      files
        .filter((path) => path.endsWith('.d.ts'))
        .map((path) => readFile(new URL(path, directory), 'utf8'))
    )
    for (const declaration of declarations) {
      expect(declaration).not.toContain('@granary/core')
      expect(declaration).not.toContain('massaman')
    }
  })

  it('returns plain outcomes narrowed with ok for success and operational failure', async () => {
    const project = await mkdtemp(join(tmpdir(), 'granary-outcomes-'))
    onTestFinished(() => rm(project, { recursive: true, force: true }))
    const client = granary({ project })
    const listed = await client.packs.list()
    expect(listed).toEqual({ ok: true, value: [], error: null })
    if (listed.ok) {
      expectTypeOf(listed.error).toEqualTypeOf<null>()
      expect(listed.value).toHaveLength(0)
    }
    const failed = await client.content.text({ path: '../outside' })
    expect(failed.ok).toBe(false)
    if (!failed.ok) {
      expectTypeOf(failed.value).toEqualTypeOf<null>()
      expect(failed.error).toMatchObject({ kind: 'invalid' })
      expect(failed.error).toBeInstanceOf(Error)
    }
    expect(Object.getPrototypeOf(listed)).toBe(Object.prototype)
    expect(Object.getPrototypeOf(failed)).toBe(Object.prototype)
  })

  it('throws a classified construction error retaining the plugin setup cause', () => {
    const plugin = definePlugin({
      name: 'broken',
      setup() {
        JSON.parse('invalid JSON')
        return {}
      },
    })
    expect(() => granary({ project: '.', plugins: [plugin()] })).toThrowError(
      expect.objectContaining({ kind: 'invalid', cause: expect.any(SyntaxError) })
    )
    expect(() => granary({ project: '' })).toThrowError(
      expect.objectContaining({ kind: 'invalid' })
    )
  })
})
