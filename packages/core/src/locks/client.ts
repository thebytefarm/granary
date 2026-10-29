import { readLockfile } from '#/locks/read.ts'
import type { InstallationError } from '#/installation/errors.ts'
import type { Lockfile } from '#/locks/schema.ts'
import type { Outcome } from '#/outcome.ts'

export type LocksClient = {
  readonly read: (options?: {
    readonly required?: boolean
  }) => Promise<Outcome<Lockfile, InstallationError>>
}

/**
 * Bind read-only lock inspection to a project; inspection never refreshes upstream revisions.
 * @param options - Project root.
 * @returns Readonly lock operations.
 */
export function createLocksClient({ project }: { readonly project: string }): LocksClient {
  return Object.freeze({
    read({ required = true }: { readonly required?: boolean } = {}): ReturnType<
      typeof readLockfile
    > {
      return readLockfile({ project, required })
    },
  })
}
