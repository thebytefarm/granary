import { isErr, ok } from 'massaman/control'
import type { Result } from 'massaman/control'

import type { InstallationError } from '../errors.js'
import { removeFile, writeAtomic } from '../filesystem/file.js'
import { mapLimited } from '../map-limited.js'
import { collectOutcomes } from './outcomes.js'
import type { FileChange } from './plan.js'

export type FileBackup = {
  readonly change: FileChange
  readonly path: string
  readonly before: Buffer | null
}

/**
 * Restore only attempted changes, in reverse order.
 */
export async function restorePreviousFiles(
  backups: readonly FileBackup[]
): Promise<Result<void, InstallationError>> {
  const restored = collectOutcomes(
    await mapLimited({
      items: backups.toReversed(),
      concurrency: 1,
      transform: restorePreviousFile,
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
async function restorePreviousFile(backup: FileBackup): Promise<Result<void, InstallationError>> {
  if (backup.before === null) {
    return removeFile(backup.path)
  }
  return writeAtomic({ path: backup.path, content: backup.before })
}
