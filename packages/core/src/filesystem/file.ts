import { glob, lstat, mkdir, mkdtemp, readFile, rename, rm, writeFile } from 'node:fs/promises'
import { dirname, join, sep } from 'node:path'

import { uniq } from 'massaman/array'
import { attemptAsync, err, isErr, ok } from 'massaman/control'
import type { Result } from 'massaman/control'

import { fromIo, installationError } from '../errors.js'
import type { InstallationError } from '../errors.js'
import { mapLimited } from '../map-limited.js'
import { checkPath } from './path.js'

/**
 * Read exact bytes through a typed filesystem boundary.
 */
export async function readBytes(path: string): Promise<Result<Buffer, InstallationError>> {
  return fromIo(await attemptAsync(() => readFile(path)))
}

/**
 * Distinguish a missing path from other filesystem failures.
 */
export async function exists(path: string): Promise<Result<boolean, InstallationError>> {
  const result = await attemptAsync(() => lstat(path))
  if (isErr(result)) {
    if ('code' in result.error && result.error.code === 'ENOENT') {
      return ok(false)
    }
    return fromIo(result)
  }
  return ok(true)
}

/**
 * Find regular files selected by positive patterns without following symlinks.
 */
export async function findFiles({
  root,
  patterns,
}: {
  readonly root: string
  readonly patterns: readonly string[]
}): Promise<Result<readonly string[], InstallationError>> {
  const found = await attemptAsync(() =>
    Array.fromAsync(
      glob([...patterns], {
        cwd: root,
        exclude: ['**/.git/**', '**/node_modules/**', '**/.context/**'],
      })
    )
  )
  if (isErr(found)) {
    return fromIo(found)
  }
  const checked = await mapLimited({
    items: uniq(found.value).toSorted(),
    concurrency: 8,
    transform: (path) => inspectSelectedFile({ root, path }),
  })
  const failed = checked.find(isErr)
  if (failed) {
    return failed
  }
  return ok(
    checked.flatMap((result) => {
      if (isErr(result) || result.value === null) {
        return []
      }
      return [result.value]
    })
  )
}

/**
 * Replace one file through an adjacent temporary file and atomic rename.
 * @returns Success after replacement and cleanup, or an I/O failure.
 */
export async function writeAtomic({
  path,
  content,
}: {
  readonly path: string
  readonly content: Buffer | string
}): Promise<Result<void, InstallationError>> {
  const parent = fromIo(await attemptAsync(() => mkdir(dirname(path), { recursive: true })))
  if (isErr(parent)) {
    return parent
  }
  const stage = fromIo(await attemptAsync(() => mkdtemp(join(dirname(path), '.granary-write-'))))
  if (isErr(stage)) {
    return stage
  }
  const written = await replaceFile({ directory: stage.value, path, content })
  const cleanup = fromIo(
    await attemptAsync(() =>
      rm(stage.value, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 })
    )
  )
  if (isErr(cleanup)) {
    return cleanup
  }
  return written
}

/**
 * Remove a file created by an interrupted installation.
 */
export async function removeFile(path: string): Promise<Result<void, InstallationError>> {
  return fromIo(await attemptAsync(() => rm(path, { force: true })))
}

/**
 * @private
 */
async function replaceFile({
  directory,
  path,
  content,
}: {
  readonly directory: string
  readonly path: string
  readonly content: Buffer | string
}): Promise<Result<void, InstallationError>> {
  return fromIo(
    await attemptAsync(async () => {
      const temporary = join(directory, 'content')
      await writeFile(temporary, content)
      await rename(temporary, path)
    })
  )
}

/**
 * @private
 */
async function inspectSelectedFile({
  root,
  path,
}: {
  readonly root: string
  readonly path: string
}): Promise<Result<string | null, InstallationError>> {
  const safe = await checkPath({ root, path })
  if (isErr(safe)) {
    return safe
  }
  const stat = fromIo(await attemptAsync(() => lstat(safe.value)))
  if (isErr(stat)) {
    return stat
  }
  if (stat.value.isDirectory()) {
    return ok(null)
  }
  if (!stat.value.isFile()) {
    return err(installationError({ kind: 'invalid', message: `Not a regular file: ${path}` }))
  }
  return ok(path.split(sep).join('/'))
}
