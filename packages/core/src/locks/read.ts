import { isErr, ok } from 'massaman/control'
import type { Result } from 'massaman/control'

import { createFilesystemClient } from '#/filesystem.ts'
import type { FilesystemError } from '#/filesystem.ts'
import { EMPTY_LOCK, lockfileSchema } from '#/locks/schema.ts'
import type { Lockfile } from '#/locks/schema.ts'

/**
 * Read locked metadata without fetching upstream material.
 * @param options - Workspace and whether a missing lockfile is an error.
 * @returns Validated metadata or an empty lock when its absence is allowed.
 */
export async function readLockfile({
  project,
  required,
}: {
  readonly project: string
  readonly required: boolean
}): Promise<Result<Lockfile, FilesystemError>> {
  const filesystem = createFilesystemClient({ root: project })
  const present = await filesystem.exists({ path: 'granary-lock.json' })
  if (isErr(present)) {
    return present
  }
  if (!present.value && !required) {
    return ok(EMPTY_LOCK)
  }
  return filesystem.readJSON({ path: 'granary-lock.json', schema: lockfileSchema })
}
