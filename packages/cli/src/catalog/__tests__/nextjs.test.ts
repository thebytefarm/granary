import { execFile } from 'node:child_process'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { promisify } from 'node:util'

import { err, ok } from 'massaman/control'
import { describe, expect, it, onTestFinished } from 'vitest'

import { createAdoptionResolver, readGitTags, selectStableTag } from '#/catalog/nextjs.ts'

const execute = promisify(execFile)

describe('Next.js recipe resolution', () => {
  const tags = [
    'v15.9.0',
    'v16.2.9',
    'v16.2.10',
    'v16.10.0',
    'v16.11.0-canary.1',
    'v17.0.0',
    'v160.0.0',
    'v16.01.0',
    'v16.99.0^{}',
    'malformed',
  ]

  it.each([
    ['16', 'v16.10.0'],
    ['16.2', 'v16.2.10'],
    ['16.2.9', 'v16.2.9'],
    ['15', 'v15.9.0'],
  ])('resolves %s numerically to %s without prereleases or adjacent versions', (version, tag) => {
    expect(selectStableTag({ tags, version })).toMatchObject({ ok: true, value: tag })
    expect(tags[0]).toBe('v15.9.0')
  })

  it('fails when no stable release matches instead of substituting a different version', () => {
    expect(selectStableTag({ tags, version: '16.3' })).toMatchObject({ ok: false })
  })

  it('expands shorthand into exact SDK intent with docs-only selection', async () => {
    const resolve = createAdoptionResolver({
      readTags: async ({ repository, pattern }) => {
        expect(repository).toBe('https://github.com/vercel/next.js.git')
        expect(pattern).toBe('refs/tags/v16*')
        return ok(tags)
      },
    })
    expect(await resolve({ source: 'nextjs@16' })).toMatchObject({
      ok: true,
      value: {
        source: {
          provider: 'github',
          owner: 'vercel',
          repo: 'next.js',
          revision: { tag: 'v16.10.0' },
        },
        files: { include: ['docs/**'] },
        summary: expect.stringContaining('nextjs@16'),
      },
    })
  })

  it.each([
    'nextjs',
    'nextjs@latest',
    'nextjs@^16',
    'nextjs@16.0.0-canary.1',
    'nextjs@14',
    'nextjs@016',
  ])('rejects unsupported selection %s before contacting upstream', async (source) => {
    const resolve = createAdoptionResolver({
      readTags: async () => {
        expect.unreachable('Invalid selections must not contact upstream')
      },
    })
    expect(await resolve({ source })).toMatchObject({ ok: false })
  })

  it.each(['branch', 'tag', 'commit'] as const)(
    'rejects conflicting --%s for shorthand',
    async (flag) => {
      const resolve = createAdoptionResolver()
      expect(await resolve({ source: 'nextjs@16', [flag]: 'other' })).toMatchObject({ ok: false })
    }
  )

  it('retains ordinary source parsing, including explicit paths resembling shorthand', async () => {
    const resolve = createAdoptionResolver()
    expect(await resolve({ source: './nextjs@16' })).toMatchObject({
      ok: true,
      value: { source: { provider: 'local', path: './nextjs@16' } },
    })
    expect(await resolve({ source: 'github:vercel/next.js', tag: 'v16.0.0' })).toMatchObject({
      ok: true,
      value: { source: { provider: 'github', revision: { tag: 'v16.0.0' } } },
    })
  })

  it('returns an upstream failure without inventing a resolution', async () => {
    const failure = new Error('Git unavailable')
    const resolve = createAdoptionResolver({ readTags: async () => err(failure) })
    expect(await resolve({ source: 'nextjs@16' })).toMatchObject({ ok: false, error: failure })
  })

  it('reads real Git tags without a checkout and selects the highest matching stable tag', async () => {
    const repository = await mkdtemp(join(tmpdir(), 'granary-recipe-tags-'))
    onTestFinished(() => rm(repository, { recursive: true, force: true }))
    await execute('git', ['init', '--quiet', repository])
    await writeFile(join(repository, 'README.md'), '# Release fixture\n')
    await execute('git', ['-C', repository, 'add', '.'])
    await execute('git', [
      '-C',
      repository,
      '-c',
      'user.name=Test',
      '-c',
      'user.email=test@example.com',
      'commit',
      '-m',
      'Fixture',
    ])
    for (const tag of ['v16.0.0', 'v16.1.0', 'v16.2.0-canary.1', 'v17.0.0']) {
      await execute('git', ['-C', repository, 'tag', tag])
    }
    const resolve = createAdoptionResolver({
      readTags: ({ pattern }) => readGitTags({ repository, pattern }),
    })
    expect(await resolve({ source: 'nextjs@16' })).toMatchObject({
      ok: true,
      value: { source: { revision: { tag: 'v16.1.0' } } },
    })
    expect(
      await readGitTags({ repository: join(repository, 'missing'), pattern: 'refs/tags/v16*' })
    ).toMatchObject({ ok: false })
  })
})
