import { lstat } from 'node:fs/promises'
import { isAbsolute, join, relative, resolve as absolutePath, sep } from 'node:path'

import { attemptAsync, err, isErr, ok } from 'massaman/control'
import type { Result } from 'massaman/control'

import { fromIo, installationError } from '../errors.js'
import type { InstallationError } from '../errors.js'
import { mapLimited } from '../map-limited.js'

export type CheckPathParams = {
  readonly root: string
  readonly path: string
  readonly allowMissing?: boolean
}

/**
 * Reject escaping paths and existing symlinks before accessing content.
 * @param options - Root, relative path, and whether absent destination components are allowed.
 * @returns An absolute contained path or a failure for traversal, symlinks, or invalid ancestors.
 */
export async function checkPath({
  root,
  path,
  allowMissing = false,
}: CheckPathParams): Promise<Result<string, InstallationError>> {
  const base = absolutePath(root)
  const target = absolutePath(base, path)
  const suffix = relative(base, target)
  if (suffix === '..' || suffix.startsWith(`..${sep}`) || isAbsolute(suffix)) {
    return err(installationError({ kind: 'invalid', message: `Path escapes root: ${path}` }))
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
}): Promise<Result<void, InstallationError>> {
  const status = await attemptAsync(() => lstat(candidate))
  if (isErr(status)) {
    if (allowMissing && 'code' in status.error && status.error.code === 'ENOENT') {
      return ok(undefined)
    }
    return fromIo(status)
  }
  if (status.value.isSymbolicLink()) {
    return err(
      installationError({ kind: 'invalid', message: `Symlink is not allowed: ${candidate}` })
    )
  }
  if (candidate !== target && !status.value.isDirectory()) {
    return err(installationError({ kind: 'invalid', message: `Not a directory: ${candidate}` }))
  }
  return ok(undefined)
}
