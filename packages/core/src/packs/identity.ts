import { uniqBy } from 'massaman/array'
import { err, ok } from 'massaman/control'
import type { Result } from 'massaman/control'

import { installationError } from '../errors.js'
import type { InstallationError } from '../errors.js'
import type { AvailablePack } from '../sources/manifests.js'

/**
 * Match full identities or unambiguous source-local slugs.
 */
export function matchPackNames({
  packs,
  names,
}: {
  readonly packs: readonly AvailablePack[]
  readonly names?: readonly string[] | undefined
}): Result<readonly AvailablePack[], InstallationError> {
  if (!names?.length) {
    const root = packs.filter((pack) => !pack.manifest.includes('/'))
    if (root.length === 1) {
      return ok(root)
    }
    if (packs.length !== 1) {
      return err(
        installationError({
          kind: 'invalid',
          message: 'Select packs explicitly with --pack; source does not contain exactly one pack.',
        })
      )
    }
    return ok(packs)
  }
  const matches = names.map((name) => matchName({ packs, name }))
  if (matches.some((found) => found.length !== 1)) {
    return err(
      installationError({
        kind: 'invalid',
        message: 'Every --pack name must identify exactly one pack.',
      })
    )
  }
  const chosen = matches.flat()
  if (uniqBy(chosen, (pack) => pack.name).length !== chosen.length) {
    return err(installationError({ kind: 'invalid', message: 'Duplicate pack selection.' }))
  }
  return ok(chosen)
}

/**
 * @private
 */
function matchName({
  packs,
  name,
}: {
  readonly packs: readonly AvailablePack[]
  readonly name: string
}): readonly AvailablePack[] {
  const exact = packs.filter((pack) => pack.name === name)
  if (exact.length) {
    return exact
  }
  return packs.filter((pack) => pack.name.split('/').at(-1) === name)
}
