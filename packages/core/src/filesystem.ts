import { glob, lstat, mkdir, mkdtemp, readFile, rename, rm, writeFile } from 'node:fs/promises'
import { dirname, join, sep, isAbsolute, relative, resolve as absolutePath } from 'node:path'
import { uniq } from 'massaman/array'
import { attemptAsync, err, isErr, ok, attempt } from 'massaman/control'
import type { Err, Result } from 'massaman/control'
import { mapLimited } from '#/map-limited.ts'
import type { z } from 'zod'

export type FilesystemError = Error & { readonly kind: 'invalid' | 'io' }
export type ReadFilesystemClient = {
  readonly read: (options: { readonly path: string }) => Promise<Result<Buffer, FilesystemError>>
  readonly readJSON: <CONTENT>(options: {
    readonly path: string
    readonly schema: z.ZodType<CONTENT>
  }) => Promise<Result<CONTENT, FilesystemError>>
  readonly exists: (options: { readonly path: string }) => Promise<Result<boolean, FilesystemError>>
  readonly find: (options: {
    readonly patterns: readonly string[]
    readonly includeIgnored?: boolean | undefined
  }) => Promise<Result<readonly string[], FilesystemError>>
}
export type FilesystemClient = ReadFilesystemClient & {
  readonly scope: (options: {
    readonly path: string
  }) => Promise<Result<FilesystemClient, FilesystemError>>
  /** Replace a file atomically through an adjacent temporary file and rename. */
  readonly write: (options: {
    readonly path: string
    readonly content: Buffer | string
  }) => Promise<Result<void, FilesystemError>>
  readonly remove: (options: { readonly path: string }) => Promise<Result<void, FilesystemError>>
}

/**
 * Bind filesystem access to a checked root directory.
 * @param options - Root containing every readable and writable path.
 * @returns Readonly operations rejecting traversal and existing symlinks before accessing content.
 */
export function createFilesystemClient({ root }: { readonly root: string }): FilesystemClient {
  return Object.freeze({
    async scope({ path }) {
      const safe = await checkPath({ root, path })
      if (isErr(safe)) return safe
      return ok(createFilesystemClient({ root: safe.value }))
    },
    async read({ path }) {
      const safe = await checkPath({ root, path })
      if (isErr(safe)) {
        return safe
      }
      return readBytes(safe.value)
    },
    async readJSON({ path, schema }) {
      const safe = await checkPath({ root, path })
      if (isErr(safe)) {
        return safe
      }
      return readJson({ path: safe.value, schema })
    },
    async exists({ path }) {
      const safe = await checkPath({ root, path, allowMissing: true })
      if (isErr(safe)) {
        return safe
      }
      return exists(safe.value)
    },
    async find({ patterns, includeIgnored }) {
      const safe = await checkPath({ root, path: '.' })
      if (isErr(safe)) {
        return safe
      }
      const valid = await Promise.all(
        patterns.map((path) => checkPath({ root, path, allowMissing: true }))
      )
      const failed = valid.find(isErr)
      if (failed) {
        return failed
      }
      return findFiles({ root, patterns, includeIgnored })
    },
    async write({ path, content }) {
      const safe = await checkPath({ root, path, allowMissing: true })
      if (isErr(safe)) {
        return safe
      }
      return writeAtomic({ path: safe.value, content })
    },
    async remove({ path }) {
      const safe = await checkPath({ root, path, allowMissing: true })
      if (isErr(safe)) {
        return safe
      }
      return removeFile(safe.value)
    },
  })
}

/**
 * Translate filesystem exceptions while retaining their original cause.
 * @param result - Captured Node filesystem outcome.
 * @returns The original success or a classified I/O failure.
 */
function fromIo(result: Err): Err<FilesystemError>
function fromIo<CONTENT>(result: Result<CONTENT>): Result<CONTENT, FilesystemError>
function fromIo<CONTENT>(result: Result<CONTENT>): Result<CONTENT, FilesystemError> {
  if (isErr(result)) {
    return err(filesystemError({ kind: 'io', message: result.error.message, cause: result.error }))
  }
  return result
}

/**
 * @private
 */
function filesystemError({
  kind,
  message,
  cause,
}: {
  readonly kind: FilesystemError['kind']
  readonly message: string
  readonly cause?: unknown
}): FilesystemError {
  return Object.assign(new Error(message, { cause }), { kind })
}

/**
 * Read exact bytes through a typed filesystem boundary.
 */
async function readBytes(path: string): Promise<Result<Buffer, FilesystemError>> {
  return fromIo(await attemptAsync(() => readFile(path)))
}

/**
 * Distinguish a missing path from other filesystem failures.
 */
async function exists(path: string): Promise<Result<boolean, FilesystemError>> {
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
async function findFiles({
  root,
  patterns,
  includeIgnored = false,
}: {
  readonly root: string
  readonly patterns: readonly string[]
  readonly includeIgnored?: boolean | undefined
}): Promise<Result<readonly string[], FilesystemError>> {
  const found = await attemptAsync(() =>
    Array.fromAsync(
      glob([...patterns], {
        cwd: root,
        exclude: fileExclusions(includeIgnored),
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
async function writeAtomic({
  path,
  content,
}: {
  readonly path: string
  readonly content: Buffer | string
}): Promise<Result<void, FilesystemError>> {
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
async function removeFile(path: string): Promise<Result<void, FilesystemError>> {
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
}): Promise<Result<void, FilesystemError>> {
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
function fileExclusions(includeIgnored: boolean): readonly string[] {
  if (includeIgnored) {
    return ['**/.git/**']
  }
  return ['**/.git/**', '**/node_modules/**', '**/.context/**', '**/.granary/**']
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
}): Promise<Result<string | null, FilesystemError>> {
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
    return err(filesystemError({ kind: 'invalid', message: `Not a regular file: ${path}` }))
  }
  return ok(path.split(sep).join('/'))
}

type CheckPathParams = {
  readonly root: string
  readonly path: string
  readonly allowMissing?: boolean
}

/**
 * Reject escaping paths and existing symlinks before accessing content.
 * @param options - Root, relative path, and whether absent destination components are allowed.
 * @returns An absolute contained path or a failure for traversal, symlinks, or invalid ancestors.
 */
async function checkPath({
  root,
  path,
  allowMissing = false,
}: CheckPathParams): Promise<Result<string, FilesystemError>> {
  const base = absolutePath(root)
  const target = absolutePath(base, path)
  const suffix = relative(base, target)
  if (suffix === '..' || suffix.startsWith(`..${sep}`) || isAbsolute(suffix)) {
    return err(filesystemError({ kind: 'invalid', message: `Path escapes root: ${path}` }))
  }
  const parts = suffix.split(sep).filter(Boolean)
  const paths = [base, ...parts.map((_, index) => join(base, ...parts.slice(0, index + 1)))]
  const checks = await mapLimited({
    items: paths,
    concurrency: 8,
    transform: (candidate) => checkComponent({ candidate, target, allowMissing }),
  })
  const failed = checks.find(isErr)
  if (failed) {
    return failed
  }
  return ok(target)
}

/**
 * @private
 */
async function checkComponent({
  candidate,
  target,
  allowMissing,
}: {
  readonly candidate: string
  readonly target: string
  readonly allowMissing: boolean
}): Promise<Result<void, FilesystemError>> {
  const status = await attemptAsync(() => lstat(candidate))
  if (isErr(status)) {
    if (allowMissing && 'code' in status.error && status.error.code === 'ENOENT') {
      return ok(undefined)
    }
    return fromIo(status)
  }
  if (status.value.isSymbolicLink()) {
    return err(
      filesystemError({ kind: 'invalid', message: `Symlink is not allowed: ${candidate}` })
    )
  }
  if (candidate !== target && !status.value.isDirectory()) {
    return err(filesystemError({ kind: 'invalid', message: `Not a directory: ${candidate}` }))
  }
  return ok(undefined)
}

/**
 * Read JSON and validate unknown input before returning domain data.
 */
async function readJson<CONTENT>({
  path,
  schema,
}: {
  readonly path: string
  readonly schema: z.ZodType<CONTENT>
}): Promise<Result<CONTENT, FilesystemError>> {
  const bytes = await readBytes(path)
  if (isErr(bytes)) {
    return bytes
  }
  return parseJson({ bytes: bytes.value, path, schema })
}

/**
 * Validate a JSON buffer without rereading a mutable source file.
 */
function parseJson<CONTENT>({
  bytes,
  path,
  schema,
}: {
  readonly bytes: Buffer
  readonly path: string
  readonly schema: z.ZodType<CONTENT>
}): Result<CONTENT, FilesystemError> {
  const parsed = attempt((): unknown => JSON.parse(bytes.toString('utf8')))
  if (isErr(parsed)) {
    return err(
      filesystemError({ kind: 'invalid', message: `Invalid JSON: ${path}`, cause: parsed.error })
    )
  }
  const validated = schema.safeParse(parsed.value)
  if (!validated.success) {
    return err(
      filesystemError({
        kind: 'invalid',
        message: `Invalid metadata: ${path}: ${validated.error.message}`,
      })
    )
  }
  return ok(validated.data)
}
