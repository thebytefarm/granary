import { createHash } from 'node:crypto'
import { glob, readFile } from 'node:fs/promises'
import { join } from 'node:path'

import { unwrap } from 'massaman/control'
import { describe, expect, it } from 'vitest'

import { openBuiltinSource } from '#/builtin-packs.ts'
import { parsePackLocator } from '#/sources/locator.ts'
import { sourceRevisionSchema } from '#/sources/source.ts'

describe('versioned built-in sources', () => {
  it('retains the immutable snapshot contents and license', async () => {
    const opened = unwrap(
      await openBuiltinSource({ provider: 'builtin', name: 'bytefarm', version: '0.1.0' })
    )
    const paths = (
      await Array.fromAsync(glob('**/*', { cwd: opened.directory, withFileTypes: true }))
    )
      .filter((entry) => entry.isFile())
      .map((entry) => join(entry.parentPath, entry.name))
    const entries = await Promise.all(
      paths.sort().map(
        async (path) =>
          `${path.slice(opened.directory.length + 1)}:${createHash('sha256')
            .update(await readFile(path))
            .digest('hex')}`
      )
    )
    expect(entries).toHaveLength(71)
    expect(createHash('sha256').update(entries.join('\n')).digest('hex')).toBe(
      '016655a7edf2b57e772f39f9ecce0f53bcdd343d32160577859939135658f51b'
    )
  })

  it.each([
    { name: 'bytefarm', version: '9.0.0' },
    { name: 'unknown', version: '0.1.0' },
  ])('rejects unavailable snapshot $name@$version', async (source) => {
    expect(await openBuiltinSource({ provider: 'builtin', ...source })).toMatchObject({
      ok: false,
      error: { kind: 'invalid' },
    })
  })

  it.each([
    'builtin:bytefarm@latest',
    'builtin:bytefarm@0.1.0@extra',
    'builtin:../bytefarm@0.1.0',
    'builtin:bytefarm@0.1.0#../escape',
  ])('rejects invalid locator %s', (locator) => {
    expect(parsePackLocator({ locator }).ok).toBe(false)
  })

  it('rejects Git commits on a built-in origin', () => {
    expect(
      sourceRevisionSchema.safeParse({
        source: { provider: 'builtin', name: 'bytefarm', version: '0.1.0' },
        revision: 'a'.repeat(40),
      }).success
    ).toBe(false)
  })
})
