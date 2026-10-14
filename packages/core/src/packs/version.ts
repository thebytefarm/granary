import { err, ok } from 'massaman/control'
import type { Result } from 'massaman/control'

import { installationError } from '../errors.js'
import type { InstallationError } from '../errors.js'
import type { ContentGroup, PackDefinition } from './definition.js'

export type VersionMapping = Partial<Record<ContentGroup, string>>

/**
 * Require exact version mappings instead of guessing upstream tag names.
 */
export function findVersionMapping({
  definition,
  version,
}: {
  readonly definition: PackDefinition
  readonly version: string | undefined
}): Result<VersionMapping, InstallationError> {
  if (!version) {
    return ok({})
  }
  const mapping = definition.versions[version]
  if (mapping) {
    return ok(mapping)
  }
  if (Object.keys(definition.versions).length === 0 && version === definition.version) {
    return ok({})
  }
  return err(
    installationError({
      kind: 'invalid',
      message: `No explicit mapping for package version ${version}.`,
    })
  )
}
