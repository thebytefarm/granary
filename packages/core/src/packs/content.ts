import { err, isErr, ok } from 'massaman/control'
import type { Result } from 'massaman/control'

import { installationError } from '../errors.js'
import type { InstallationError } from '../errors.js'
import type { ContentGroup, PackDefinition } from './definition.js'

export type SelectedContent = NonNullable<PackDefinition['groups'][ContentGroup]> & {
  readonly name: ContentGroup
}

/**
 * Choose only declared content groups, keeping selection independent of retrieval.
 */
export function chooseContentGroups({
  definition,
  names,
}: {
  readonly definition: PackDefinition
  readonly names: readonly ContentGroup[]
}): Result<readonly SelectedContent[], InstallationError> {
  const selected = names.map((name): Result<SelectedContent, InstallationError> => {
    const group = definition.groups[name]
    if (!group) {
      return err(
        installationError({
          kind: 'invalid',
          message: `Pack ${definition.name} has no ${name} group.`,
        })
      )
    }
    return ok({ ...group, name })
  })
  const failed = selected.find(isErr)
  if (failed) {
    return failed
  }
  return ok(
    selected.flatMap((group) => {
      if (isErr(group)) {
        return []
      }
      return [group.value]
    })
  )
}
