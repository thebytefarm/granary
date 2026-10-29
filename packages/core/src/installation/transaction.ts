import { resolve as absolutePath, sep } from 'node:path'

import { reduceAsync } from 'massaman/array'
import { err, isErr, ok } from 'massaman/control'
import type { Result } from 'massaman/control'
import { match } from 'massaman/match'

import { installationError } from '#/installation/errors.ts'
import type { InstallationError } from '#/installation/errors.ts'
import { createFilesystemClient } from '#/filesystem.ts'
import { mapLimited } from '#/map-limited.ts'
import { hashContent } from '#/content/hash.ts'
import { collectOutcomes } from '#/results.ts'
import type { FileChange, InstallationPlan } from '#/installation/plan.ts'

type PreparedTransaction = { readonly apply: () => Promise<Result<void, InstallationError>> }
type TransactionClient = {
  readonly prepare: (
    plan: InstallationPlan
  ) => Promise<Result<PreparedTransaction, InstallationError>>
  readonly apply: (plan: InstallationPlan) => Promise<Result<void, InstallationError>>
}

/**
 * Bind preflight, stale-state checks, writes, and rollback to one workspace.
 * @param options - Workspace whose managed destinations may be written.
 * @returns A transaction capability that never writes before complete preflight.
 */
export function createTransactionClient({
  project,
}: {
  readonly project: string
}): TransactionClient {
  /**
   * @private
   */
  async function prepare(
    plan: InstallationPlan
  ): Promise<Result<PreparedTransaction, InstallationError>> {
    const backups = await inspectDestinationFiles({ project, changes: plan.changes })
    if (isErr(backups)) {
      return backups
    }
    return ok(
      Object.freeze({
        async apply(): Promise<Result<void, InstallationError>> {
          const progress = await applyFileChanges({ project, backups: backups.value })
          return match(progress)
            .with({ status: 'writing' }, () => ok(undefined))
            .with({ status: 'failed' }, (progress) => recoverChanges({ project, progress }))
            .exhaustive()
        },
      })
    )
  }
  return Object.freeze({
    prepare,
    async apply(plan: InstallationPlan): Promise<Result<void, InstallationError>> {
      const prepared = await prepare(plan)
      if (isErr(prepared)) {
        return prepared
      }
      return prepared.value.apply()
    },
  })
}

/**
 * @private
 */
type FileBackup = {
  readonly change: FileChange
  readonly path: string
  readonly before: Buffer | null
}

/**
 * @private
 */
type WriteProgress =
  | { readonly status: 'writing'; readonly attempted: readonly FileBackup[] }
  | {
      readonly status: 'failed'
      readonly attempted: readonly FileBackup[]
      readonly error: InstallationError
    }

/**
 * @private
 */
async function applyFileChanges({
  project,
  backups,
}: {
  readonly project: string
  readonly backups: readonly FileBackup[]
}): Promise<WriteProgress> {
  const initial: WriteProgress = { status: 'writing', attempted: [] }
  return reduceAsync(
    backups,
    (progress: WriteProgress, backup) => applyNextChange({ progress, backup, project }),
    initial
  )
}

/**
 * @private
 */
async function applyNextChange({
  progress,
  backup,
  project,
}: {
  readonly progress: WriteProgress
  readonly backup: FileBackup
  readonly project: string
}): Promise<WriteProgress> {
  if (progress.status === 'failed') {
    return progress
  }
  const unchanged = await checkDestinationUnchanged({ project, backup })
  if (isErr(unchanged)) {
    return { status: 'failed', attempted: progress.attempted, error: unchanged.error }
  }
  const written = await writeChange({ project, backup })
  const attempted = [...progress.attempted, backup]
  if (isErr(written)) {
    return { status: 'failed', attempted, error: written.error }
  }
  return { status: 'writing', attempted }
}

/**
 * @private
 */
async function writeChange({
  project,
  backup,
}: {
  readonly project: string
  readonly backup: FileBackup
}): Promise<Result<void, InstallationError>> {
  const filesystem = createFilesystemClient({ root: project })
  if (backup.change.content === null) {
    return filesystem.remove({ path: backup.path })
  }
  return filesystem.write({ path: backup.path, content: backup.change.content })
}

/**
 * @private
 */
async function recoverChanges({
  project,
  progress,
}: {
  readonly project: string
  readonly progress: Extract<WriteProgress, { status: 'failed' }>
}): Promise<Result<void, InstallationError>> {
  const restored = await restorePreviousFiles({ project, backups: progress.attempted })
  if (isErr(restored)) {
    return err(
      installationError({
        kind: 'io',
        message: `Installation failed and recovery failed: ${restored.error.message}`,
        cause: progress.error,
      })
    )
  }
  return err(progress.error)
}

/**
 * @private
 */
async function inspectDestinationFiles({
  project,
  changes,
}: {
  readonly project: string
  readonly changes: readonly FileChange[]
}): Promise<Result<readonly FileBackup[], InstallationError>> {
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
  return collectOutcomes(
    await mapLimited({
      items: changes,
      concurrency: 8,
      transform: (change) => inspectDestination({ project, change }),
    })
  )
}

/**
 * @private
 */
async function checkDestinationUnchanged({
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
async function inspectDestination({
  project,
  change,
}: {
  readonly project: string
  readonly change: FileChange
}): Promise<Result<FileBackup, InstallationError>> {
  const filesystem = createFilesystemClient({ root: project })
  const present = await filesystem.exists({ path: change.path })
  if (isErr(present)) {
    return present
  }
  if (!present.value) {
    if (change.expected !== undefined && change.expectedMissing === false) {
      return err(
        installationError({
          kind: 'conflict',
          message: `Reviewed file is now missing: ${change.path}`,
        })
      )
    }
    return ok({ change, path: change.path, before: null })
  }
  const before = await filesystem.read({ path: change.path })
  if (isErr(before)) {
    return before
  }
  if (
    change.expectedMissing === true ||
    (!change.replace &&
      (change.expected === undefined ||
        ![change.expected, ...(change.expectedAlternatives ?? [])].includes(
          hashContent(before.value)
        )))
  ) {
    return err(
      installationError({
        kind: 'conflict',
        message: `Preserving unmanaged or edited file: ${change.path}`,
      })
    )
  }
  return ok({ change, path: change.path, before: before.value })
}

/**
 * @private
 */
async function restorePreviousFiles({
  project,
  backups,
}: {
  readonly project: string
  readonly backups: readonly FileBackup[]
}): Promise<Result<void, InstallationError>> {
  const restored = collectOutcomes(
    await mapLimited({
      items: backups.toReversed(),
      concurrency: 1,
      transform: (backup) => restorePreviousFile({ project, backup }),
    })
  )
  if (isErr(restored)) {
    return restored
  }
  return ok(undefined)
}

/**
 * @private
 */
async function restorePreviousFile({
  project,
  backup,
}: {
  readonly project: string
  readonly backup: FileBackup
}): Promise<Result<void, InstallationError>> {
  const filesystem = createFilesystemClient({ root: project })
  if (backup.before === null) {
    return filesystem.remove({ path: backup.path })
  }
  return filesystem.write({ path: backup.path, content: backup.before })
}
