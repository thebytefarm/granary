import { err, ok } from 'massaman/control'
import type { Result } from 'massaman/control'
import { isEqual } from 'massaman/predicate'

import { installationError } from '#/installation/errors.ts'
import type { InstallationError } from '#/installation/errors.ts'
import type { ProjectConfig } from '#/workspace/config.ts'
import type { Lockfile } from '#/locks/schema.ts'
import { defaultContextOutput } from '#/workspace/paths.ts'

/**
 * Compare consumer intent semantically instead of depending on JSON property order.
 */
export function checkProjectConsistency({
  config,
  lock,
}: {
  readonly config: ProjectConfig
  readonly lock: Lockfile
}): Result<void, InstallationError> {
  if (
    !isEqual(config.composition, lock.composition) ||
    lock.packs.length !== config.packs.length ||
    config.packs.some((request) => {
      const pack = lock.packs.find((entry) => entry.request.name === request.name)
      return (
        !pack ||
        !isEqual(request, pack.request) ||
        pack.output !== (request.output ?? config.output) ||
        pack.codeOutput !==
          (request.codeOutput ?? config.codeOutput ?? repositoryCodeFallback(request.selection))
      )
    })
  ) {
    return err(
      installationError({
        kind: 'drift',
        message:
          'Project configuration differs from the lockfile; install cannot move recorded identities.',
      })
    )
  }
  return ok(undefined)
}

/**
 * @private
 */
function repositoryCodeFallback(selection: unknown): string | undefined {
  if (selection !== undefined) {
    return `${defaultContextOutput}/repos`
  }
  return undefined
}
