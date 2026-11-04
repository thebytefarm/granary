import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { mkdir, mkdtemp, readFile, readdir, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { promisify } from 'node:util'

import { ok } from 'massaman/control'
import { describe, expect, it, onTestFinished } from 'vitest'

import { expectSuccess } from '#/__tests__/support.ts'
import { createGitClient } from '#/sources/git/client.ts'
import { createFilesystemClient } from '#/filesystem.ts'
import type { Source } from '#/sources/source.ts'
import { createGranary } from '#/client.ts'

const execute = promisify(execFile)
const identity = {
  ...process.env,
  GIT_AUTHOR_NAME: 'Test',
  GIT_AUTHOR_EMAIL: 'test@example.com',
  GIT_COMMITTER_NAME: 'Test',
  GIT_COMMITTER_EMAIL: 'test@example.com',
}

describe('targeted Git retrieval', { timeout: 20_000 }, () => {
  it('selects thousands of expanded paths without a tree-by-pattern glob scan', async () => {
    const { source, current } = await repository()
    const paths = Array.from({ length: 2000 }, (_, index) => `docs/page-${index}.md`)
    for (const path of paths) {
      await writeFile(join(source, path), `# Selection fixture: ${path}\n`)
    }
    await commit({ source, parent: current })
    expectSuccess(
      await createGitClient().withCheckout({
        source: { provider: 'git', repository: pathToFileURL(source).href },
        async use(opened) {
          assert.ok(opened.checkout)
          const started = performance.now()
          const selected = expectSuccess(opened.checkout.find({ root: '.', patterns: paths }))
          expect(selected).toEqual(paths.toSorted())
          expect(performance.now() - started).toBeLessThan(2000)
          expectSuccess(await opened.checkout.materialize({ paths: paths.slice(0, 600) }))
          expect(await readFile(join(opened.directory, paths[599] ?? ''), 'utf8')).toBe(
            '# Selection fixture: docs/page-599.md\n'
          )
          const packs = await readdir(join(opened.directory, '.git/objects/pack'))
          expect(packs.filter((path) => path.endsWith('.pack')).length).toBeLessThanOrEqual(3)
          expect(
            expectSuccess(
              opened.checkout.find({
                root: 'docs',
                patterns: ['page-1.md', 'page-?.md', './page-10.md', 'page-{11,12}.md'],
              })
            )
          ).toEqual(
            [
              ...Array.from({ length: 10 }, (_, index) => `page-${index}.md`),
              'page-11.md',
              'page-12.md',
            ].toSorted()
          )
          return ok(undefined)
        },
      })
    )
  })

  it('fetches one commit and materializes selected blobs without downloading unrelated content', async () => {
    const { source, current } = await repository()
    const unrelated = (
      await git({ source, args: ['rev-parse', `${current}:unrelated.bin`] })
    ).trim()
    const selected = (
      await git({ source, args: ['rev-parse', `${current}:docs/[guide] Zoë.md`] })
    ).trim()
    const directory = expectSuccess(
      await createGitClient().withCheckout({
        source: { provider: 'git', repository: pathToFileURL(source).href },
        async use(opened) {
          assert.ok(opened.checkout)
          expect(opened.revision).toBe(current)
          expect(await readdir(opened.directory)).toEqual(['.git'])
          expect(
            (await git({ source: opened.directory, args: ['rev-list', '--count', current] })).trim()
          ).toBe('1')
          const missing = await git({
            source: opened.directory,
            args: ['rev-list', '--objects', '--missing=print', current],
          })
          expect(missing).toContain(`?${unrelated}`)
          expect(missing).toContain(`?${selected}`)
          expect(
            expectSuccess(opened.checkout.find({ root: 'docs', patterns: ['**/*.md'] }))
          ).toEqual(['[guide] Zoë.md'])
          expectSuccess(await opened.checkout.materialize({ paths: ['docs/[guide] Zoë.md'] }))
          expect(await readFile(join(opened.directory, 'docs/[guide] Zoë.md'), 'utf8')).toBe(
            '# Current\n'
          )
          expect(await readdir(opened.directory)).toEqual(['.git', 'docs'])
          const remaining = await git({
            source: opened.directory,
            args: ['rev-list', '--objects', '--missing=print', current],
          })
          expect(remaining).toContain(`?${unrelated}`)
          expect(remaining).not.toContain(`?${selected}`)
          return ok(opened.directory)
        },
      })
    )
    await expect(readdir(directory)).rejects.toMatchObject({ code: 'ENOENT' })
  })

  it.each([{ branch: 'main' }, { tag: 'release' }])(
    'resolves explicit branch and annotated tag selectors: %j',
    async (revision) => {
      const { source, current } = await repository()
      expectSuccess(
        await createGitClient().withCheckout({
          source: { provider: 'git', repository: pathToFileURL(source).href, revision },
          async use(opened) {
            expect(opened.revision).toBe(current)
            return ok(undefined)
          },
        })
      )
    }
  )

  it('rejects ambiguous shorthand but restores an exact older commit after the branch advances', async () => {
    const { source, previous } = await repository()
    const remote: Extract<Source, { provider: 'git' }> = {
      provider: 'git',
      repository: pathToFileURL(source).href,
      revision: 'main',
    }
    await git({ source, args: ['tag', 'main'] })
    const ambiguous = await createGitClient().withCheckout({
      source: remote,
      use: async () => ok(undefined),
    })
    expect(ambiguous).toMatchObject({
      ok: false,
      error: { kind: 'invalid', message: expect.stringContaining('Ambiguous') },
    })
    expectSuccess(
      await createGitClient().withCheckout({
        source: remote,
        revision: previous,
        async use(opened) {
          assert.ok(opened.checkout)
          expect(opened.revision).toBe(previous)
          expectSuccess(await opened.checkout.materialize({ paths: ['docs/[guide] Zoë.md'] }))
          expect(await readFile(join(opened.directory, 'docs/[guide] Zoë.md'), 'utf8')).toBe(
            '# Previous\n'
          )
          return ok(undefined)
        },
      })
    )
  })

  it('matches filesystem glob selection while rejecting selected symlinks and symlinked roots', async () => {
    const { source, current } = await repository()
    await symlink('unrelated.bin', join(source, 'linked.md'))
    await symlink('docs', join(source, 'linked-directory'))
    await commit({ source, parent: current })
    expectSuccess(
      await createGitClient().withCheckout({
        source: { provider: 'git', repository: pathToFileURL(source).href },
        async use(opened) {
          assert.ok(opened.checkout)
          for (const patterns of [['docs/**'], ['.hidden.md'], ['docs', 'unrelated.bin']]) {
            const expected = await createFilesystemClient({ root: source }).find({
              patterns,
              includeIgnored: true,
            })
            expect(expectSuccess(opened.checkout.find({ root: '.', patterns }))).toEqual(
              expectSuccess(expected)
            )
          }
          expect(
            opened.checkout.find({ root: 'linked-directory', patterns: ['**/*'] })
          ).toMatchObject({ ok: false })
          expect(await opened.checkout.materialize({ paths: ['linked.md'] })).toMatchObject({
            ok: false,
            error: { kind: 'invalid' },
          })
          expect(
            await opened.checkout.materialize({ paths: ['linked-directory/granary.json'] })
          ).toMatchObject({ ok: false })
          expectSuccess(await opened.checkout.materialize({ paths: ['docs/[guide] Zoë.md'] }))
          expect(await readFile(join(opened.directory, 'docs/[guide] Zoë.md'), 'utf8')).toBe(
            '# Current\n'
          )
          return ok(undefined)
        },
      })
    )
  })

  it('does not substitute a moving branch when a locked commit is unavailable', async () => {
    const { source } = await repository()
    const result = await createGitClient().withCheckout({
      source: {
        provider: 'git',
        repository: pathToFileURL(source).href,
        revision: { branch: 'main' },
      },
      revision: 'a'.repeat(40),
      use: async () => {
        assert.fail('Unavailable commits must not reach the content reader.')
      },
    })
    expect(result).toMatchObject({ ok: false })
  })

  it.each([true, false])(
    'installs selected documentation without materializing unrelated symlinks (filtering: %s)',
    async (filtering) => {
      const { source, current } = await repository()
      await git({ source, args: ['config', 'uploadpack.allowFilter', String(filtering)] })
      await writeFile(join(source, 'docs/plain.md'), '# Selected documentation\n')
      await symlink('unrelated.bin', join(source, 'readme.md'))
      await commit({ source, parent: current })
      const project = await mkdtemp(join(tmpdir(), 'granary-targeted-consumer-'))
      onTestFinished(() => rm(project, { recursive: true, force: true }))
      const client = createGranary({ project })
      expectSuccess(
        await client.packs.add({
          source: { provider: 'git', repository: pathToFileURL(source).href },
          files: { include: ['docs/plain.md'] },
          output: 'reference',
        })
      )
      expect(await readFile(join(project, 'reference/docs/plain.md'), 'utf8')).toBe(
        '# Selected documentation\n'
      )
      expect(await readdir(join(project, 'reference'))).toEqual(['docs'])
      const unsafeProject = join(project, 'unsafe-consumer')
      await mkdir(unsafeProject)
      const intent = JSON.stringify({ name: 'consumer', packs: {} })
      await writeFile(join(unsafeProject, 'granary.json'), intent)
      expect(
        await createGranary({ project: unsafeProject }).packs.add({
          source: { provider: 'git', repository: pathToFileURL(source).href },
          files: { include: ['readme.md'] },
          output: 'unsafe',
        })
      ).toMatchObject({
        ok: false,
        error: { kind: 'invalid', message: expect.stringContaining('Unsafe source path') },
      })
      expect(await readFile(join(unsafeProject, 'granary.json'), 'utf8')).toBe(intent)
      expect(await readdir(unsafeProject)).toEqual(['granary.json'])
    }
  )
})

async function repository(): Promise<{
  readonly source: string
  readonly previous: string
  readonly current: string
}> {
  const source = await mkdtemp(join(tmpdir(), 'granary-targeted-git-'))
  onTestFinished(() => rm(source, { recursive: true, force: true }))
  await git({ source, args: ['init', '--quiet', '-b', 'main'] })
  await git({ source, args: ['config', 'uploadpack.allowFilter', 'true'] })
  await mkdir(join(source, 'docs'))
  await writeFile(join(source, 'docs/[guide] Zoë.md'), '# Previous\n')
  await writeFile(join(source, '.hidden.md'), '# Hidden\n')
  await writeFile(join(source, 'unrelated.bin'), Buffer.alloc(1024 * 1024, 42))
  const previous = await commit({ source })
  await writeFile(join(source, 'docs/[guide] Zoë.md'), '# Current\n')
  const current = await commit({ source, parent: previous })
  await git({ source, args: ['tag', '-a', 'release', '-m', 'Annotated release'] })
  return { source, previous, current }
}

async function commit({
  source,
  parent,
}: {
  readonly source: string
  readonly parent?: string
}): Promise<string> {
  await git({ source, args: ['add', '.'] })
  const tree = (await git({ source, args: ['write-tree'] })).trim()
  const head = [parent].flatMap((revision) => {
    if (!revision) return []
    return ['-p', revision]
  })
  const revision = (
    await git({ source, args: ['commit-tree', tree, ...head, '-m', 'Fixture revision'] })
  ).trim()
  await git({ source, args: ['update-ref', 'refs/heads/main', revision] })
  return revision
}

async function git({
  source,
  args,
}: {
  readonly source: string
  readonly args: readonly string[]
}): Promise<string> {
  const result = await execute('git', ['-C', source, ...args], { env: identity })
  return result.stdout
}
