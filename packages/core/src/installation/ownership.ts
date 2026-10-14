import { resolve as absolutePath, sep } from 'node:path'

import { err, isErr, ok } from 'massaman/control'
import type { Result } from 'massaman/control'

import { installationError } from '../errors.js'
import type { InstallationError } from '../errors.js'
import { exists, readBytes } from '../filesystem/file.js'
import { checkPath } from '../filesystem/path.js'
import { mapLimited } from '../map-limited.js'
import type { FileBackup } from './backup.js'
import { hashContent } from './integrity.js'
import { collectOutcomes } from './outcomes.js'
import type { FileChange } from './plan.js'

/**
 * Inspect every destination before writes, preserving unmanaged and locally edited files.
 */
export async function inspectDestinationFiles({
  project,
  changes,
}: {
  readonly project: string
  readonly changes: readonly FileChange[]
}): Promise<Result<readonly FileBackup[], InstallationError>> {
  const conflicts = checkDestinationConflicts({ project, changes })
  if (isErr(conflicts)) {
    return conflicts
  }
  return collectOutcomes(
    await mapLimited({
      items: changes,
      concurrency: 8,
      transform: (change) => inspectDestination({ project, change }),
    })
  )
}

/**
 * Reject a destination that changed after preflight without overwriting the new bytes.
 */
export async function checkDestinationUnchanged({
  project,
  backup,
}: {
  readonly project: string
  readonly backup: FileBackup
}): Promise<Result<void, InstallationError>> {
  const current = await inspectDestination({ project, change: backup.change })
  if (isErr(current)) {
    return current
  }
  if (!hasSameBytes({ before: backup.before, current: current.value.before })) {
    return err(
      installationError({
        kind: 'conflict',
        message: `Destination changed during installation: ${backup.change.path}`,
      })
    )
  }
  return ok(undefined)
}

/**
 * @private
 */
function hasSameBytes({
  before,
  current,
}: {
  readonly before: Buffer | null
  readonly current: Buffer | null
}): boolean {
  if (before === null || current === null) {
    return before === current
  }
  return before.equals(current)
}

/**
 * @private
 */
function checkDestinationConflicts({
  project,
  changes,
}: {
  readonly project: string
  readonly changes: readonly FileChange[]
}): Result<void, InstallationError> {
  const targets = changes.map((change) => absolutePath(project, change.path))
  if (
    targets.some((target, index) =>
      targets.some(
        (other, otherIndex) =>
          index !== otherIndex && (target === other || target.startsWith(`${other}${sep}`))
      )
    )
  ) {
    return err(
      installationError({ kind: 'conflict', message: 'Installation destinations overlap.' })
    )
  }
  return ok(undefined)
}

/**
 * @private
 */
async function inspectDestination({
  project,
  change,
}: {
  readonly project: string
  readonly change: FileChange
}): Promise<Result<FileBackup, InstallationError>> {
  const safe = await checkPath({ root: project, path: change.path, allowMissing: true })
  if (isErr(safe)) {
    return safe
  }
  const present = await exists(safe.value)
  if (isErr(present)) {
    return present
  }
  if (!present.value) {
    return ok({ change, path: safe.value, before: null })
  }
  const before = await readBytes(safe.value)
  if (isErr(before)) {
    return before
  }
  const ownership = checkManagedFile({ change, content: before.value })
  if (isErr(ownership)) {
    return ownership
  }
  return ok({ change, path: safe.value, before: before.value })
}

/**
 * @private
 */
function checkManagedFile({
  change,
  content,
}: {
  readonly change: FileChange
  readonly content: Buffer
}): Result<void, InstallationError> {
  if (
    !change.replace &&
    (change.expected === undefined ||
      ![change.expected, ...(change.expectedAlternatives ?? [])].includes(hashContent(content)))
  ) {
    return err(
      installationError({
        kind: 'conflict',
        message: `Preserving unmanaged or edited file: ${change.path}`,
      })
    )
  }
  return ok(undefined)
}
