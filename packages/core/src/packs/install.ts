import { isErr } from 'massaman/control'
import type { Result } from 'massaman/control'

import type { InstallationError } from '#/installation/errors.ts'
import { createFilesystemClient } from '#/filesystem.ts'
import { createInstallationClient } from '#/installation/client.ts'
import { readLockfile } from '#/locks/read.ts'
import type { Lockfile } from '#/locks/schema.ts'
import { EMPTY_LOCK } from '#/locks/schema.ts'
import type { ProjectConfig } from '#/workspace/config.ts'
import { checkProjectConsistency } from '#/workspace/consistency.ts'

/**
 * Restore locked content or install declared selections for the first time.
 * @param options - Workspace and validated consumer intent.
 * @returns Exact locked identities after a preflighted transaction; restoration never advances sources.
 */
export async function installPacks({
  project,
  config,
}: {
  readonly project: string
  readonly config: ProjectConfig
}): Promise<Result<Lockfile, InstallationError>> {
  const filesystem = createFilesystemClient({ root: project })
  const installation = createInstallationClient({ project })
  const present = await filesystem.exists({ path: 'granary-lock.json' })
  if (isErr(present)) {
    return present
  }
  if (!present.value) {
    const prepared = await installation.prepare({
      kind: 'add',
      config: { ...config, packs: [] },
      previous: EMPTY_LOCK,
      requests: config.packs,
    })
    if (isErr(prepared)) {
      return prepared
    }
    return installation.apply(prepared.value)
  }
  const lock = await readLockfile({ project, required: true })
  if (isErr(lock)) {
    return lock
  }
  const consistent = checkProjectConsistency({ config, lock: lock.value })
  if (isErr(consistent)) {
    return consistent
  }
  const prepared = await installation.prepare({ kind: 'restore', lock: lock.value })
  if (isErr(prepared)) {
    return prepared
  }
  return installation.apply(prepared.value)
}
