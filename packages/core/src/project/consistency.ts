import { err, ok } from 'massaman/control'
import type { Result } from 'massaman/control'
import { isEqual } from 'massaman/predicate'

import { installationError } from '../errors.js'
import type { InstallationError } from '../errors.js'
import type { ProjectConfig } from './config.js'
import type { Lockfile } from './lock.js'

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
    !isEqual(
      config.presets ?? [],
      (lock.presets ?? []).map((preset) => preset.request)
    ) ||
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
    return '.context/repos'
  }
  return undefined
}
