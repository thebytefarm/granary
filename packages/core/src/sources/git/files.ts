import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { matchesGlob, posix, join } from 'node:path'

import { attemptAsync, err, isErr, ok } from 'massaman/control'
import type { Result } from 'massaman/control'
import { chunk, uniq } from 'massaman/array'

import { exec } from '#/process/exec.ts'
import { fromIo, sourceError } from '#/sources/errors.ts'
import type { SourceError } from '#/sources/errors.ts'
import { relativePathSchema } from '#/sources/source.ts'
import type { OpenedSource } from '#/sources/source.ts'
import { collectOutcomes } from '#/results.ts'

/**
 * @private
 */
type TreeFile = { readonly path: string; readonly mode: string; readonly object: string }

/**
 * Inspect a fetched tree without downloading blobs, and materialize only requested files.
 * @private
 */
export async function createGitFiles({
  directory,
  commit,
}: {
  readonly directory: string
  readonly commit: string
}): Promise<Result<NonNullable<OpenedSource['checkout']>, SourceError>> {
  const tree = await exec({
    executable: 'git',
    args: ['ls-tree', '--full-tree', '-r', '-z', commit],
    cwd: directory,
    timeout: 120_000,
    maxBuffer: 16 * 1024 * 1024,
  })
  if (isErr(tree)) return tree
  const parsed = collectOutcomes(tree.value.stdout.split('\0').filter(Boolean).map(parseTreeFile))
  if (isErr(parsed)) return parsed
  const files = parsed.value.filter((file) => file.mode !== '160000')
  const byPath = Object.fromEntries(files.map((file) => [file.path, file]))
  const symlinks = files.filter((file) => file.mode === '120000')
  return ok({
    find({ root, patterns }) {
      if (!relativePathSchema.safeParse(root).success) {
        return err(
          sourceError({ kind: 'invalid', message: 'Expected a repository-relative content root.' })
        )
      }
      if (files.some((file) => file.path === root || root.startsWith(`${file.path}/`))) {
        return err(
          sourceError({ kind: 'invalid', message: `Content root is not a directory: ${root}.` })
        )
      }
      const scoped = files.filter((file) => root === '.' || file.path.startsWith(`${root}/`))
      if (root !== '.' && scoped.length === 0) {
        return err(sourceError({ kind: 'invalid', message: `Content root is missing: ${root}.` }))
      }
      const exact = Object.fromEntries(
        patterns.filter(isExactPattern).map((pattern) => [pattern, true])
      )
      const globs = patterns.filter((pattern) => !isExactPattern(pattern))
      const selected = scoped.filter((file) => {
        const path = posix.relative(root, file.path)
        return Object.hasOwn(exact, path) || globs.some((pattern) => matchesGlob(path, pattern))
      })
      return ok(selected.map((file) => posix.relative(root, file.path)).toSorted())
    },
    async materialize({ paths }) {
      const unsafe = paths.find(
        (path) =>
          !relativePathSchema.safeParse(path).success ||
          symlinks.some((file) => path === file.path || path.startsWith(`${file.path}/`))
      )
      if (unsafe) {
        return err(sourceError({ kind: 'invalid', message: `Unsafe source path: ${unsafe}.` }))
      }
      const selected = paths.flatMap((path) => {
        if (!Object.hasOwn(byPath, path)) return []
        const file = byPath[path]
        if (!file) return []
        return [file]
      })
      if (selected.length === 0) return ok(undefined)
      const fetched = await prefetchBlobs({
        directory,
        objects: selected.map((file) => file.object),
      })
      if (isErr(fetched)) return fetched
      return restoreFiles({ directory, commit, paths: selected.map((file) => file.path) })
    },
  })
}

/**
 * Keep glob syntax and noncanonical paths on Node's matcher; expanded plain paths need only lookup.
 * @private
 */
function isExactPattern(pattern: string): boolean {
  return !/[\\*?[\]{}()!+@]/.test(pattern) && posix.normalize(pattern) === pattern
}

/**
 * @private
 */
function parseTreeFile(record: string): Result<TreeFile, SourceError> {
  const match = /^([0-7]{6}) (?:blob|commit) ([a-f0-9]{40}(?:[a-f0-9]{24})?)\t([\s\S]+)$/.exec(
    record
  )
  const mode = match?.[1]
  const object = match?.[2]
  const path = match?.[3]
  if (!mode || !object || !path) {
    return err(sourceError({ kind: 'invalid', message: 'Git returned an invalid tree entry.' }))
  }
  return ok({ mode, object, path })
}

/**
 * Avoid restore's single-blob lazy fetches without exceeding process argument limits.
 * @private
 */
async function prefetchBlobs({
  directory,
  objects,
}: {
  readonly directory: string
  readonly objects: readonly string[]
}): Promise<Result<void, SourceError>> {
  for (const batch of chunk(uniq(objects), 512)) {
    const fetched = await exec({
      executable: 'git',
      args: [
        '-c',
        'fetch.negotiationAlgorithm=noop',
        'fetch',
        '--quiet',
        '--no-tags',
        '--no-write-fetch-head',
        '--recurse-submodules=no',
        '--filter=blob:none',
        '--',
        'origin',
        ...batch,
      ],
      cwd: directory,
      timeout: 120_000,
      maxBuffer: 1024 * 1024,
      env: { ...process.env, GIT_TERMINAL_PROMPT: '0' },
    })
    if (isErr(fetched)) return fetched
  }
  return ok(undefined)
}

/**
 * @private
 */
async function restoreFiles({
  directory,
  commit,
  paths,
}: {
  readonly directory: string
  readonly commit: string
  readonly paths: readonly string[]
}): Promise<Result<void, SourceError>> {
  const temporary = fromIo(
    await attemptAsync(() => mkdtemp(join(directory, '.git', 'granary-paths-')))
  )
  if (isErr(temporary)) return temporary
  const pathspec = join(temporary.value, 'files')
  const written = fromIo(await attemptAsync(() => writeFile(pathspec, `${paths.join('\0')}\0`)))
  const result = await restoreWrittenFiles({ directory, commit, pathspec, written })
  const cleanup = fromIo(
    await attemptAsync(() => rm(temporary.value, { recursive: true, force: true }))
  )
  if (isErr(cleanup)) return cleanup
  return result
}

/**
 * @private
 */
async function restoreWrittenFiles({
  directory,
  commit,
  pathspec,
  written,
}: {
  readonly directory: string
  readonly commit: string
  readonly pathspec: string
  readonly written: Result<void, SourceError>
}): Promise<Result<void, SourceError>> {
  if (isErr(written)) return written
  const restored = await exec({
    executable: 'git',
    args: [
      '--literal-pathspecs',
      'restore',
      `--source=${commit}`,
      '--worktree',
      `--pathspec-from-file=${pathspec}`,
      '--pathspec-file-nul',
    ],
    cwd: directory,
    timeout: 120_000,
    maxBuffer: 1024 * 1024,
    env: { ...process.env, GIT_TERMINAL_PROMPT: '0' },
  })
  if (isErr(restored)) return restored
  return ok(undefined)
}
