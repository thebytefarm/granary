import { reduceAsync } from 'massaman/array'
import { err, isErr, ok } from 'massaman/control'
import type { Result } from 'massaman/control'
import { match } from 'massaman/match'

import { installationError } from '../errors.js'
import type { InstallationError } from '../errors.js'
import { writeAtomic } from '../filesystem/file.js'
import { restorePreviousFiles } from './backup.js'
import type { FileBackup } from './backup.js'
import { checkDestinationUnchanged, inspectDestinationFiles } from './ownership.js'
import type { InstallationPlan } from './plan.js'

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
 * Preflight a complete plan and recover attempted writes if an ordinary I/O failure occurs.
 * @returns Success after all writes, or the original failure after attempting recovery.
 */
export async function applyInstallation({
  project,
  plan,
}: {
  readonly project: string
  readonly plan: InstallationPlan
}): Promise<Result<void, InstallationError>> {
  const backups = await inspectDestinationFiles({ project, changes: plan.changes })
  if (isErr(backups)) {
    return backups
  }
  const progress = await applyFileChanges({ project, backups: backups.value })
  return match(progress)
    .with({ status: 'writing' }, () => ok(undefined))
    .with({ status: 'failed' }, recoverChanges)
    .exhaustive()
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
  const written = await writeAtomic({ path: backup.path, content: backup.change.content })
  const attempted = [...progress.attempted, backup]
  if (isErr(written)) {
    return { status: 'failed', attempted, error: written.error }
  }
  return { status: 'writing', attempted }
}

/**
 * @private
 */
async function recoverChanges(
  progress: Extract<WriteProgress, { status: 'failed' }>
): Promise<Result<void, InstallationError>> {
  const restored = await restorePreviousFiles(progress.attempted)
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
