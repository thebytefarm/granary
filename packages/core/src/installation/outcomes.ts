import { isErr, ok } from 'massaman/control'
import type { Result } from 'massaman/control'

import type { InstallationError } from '../errors.js'

/**
 * Collect successful installation stages or return the first typed failure.
 */
export function collectOutcomes<CONTENT>(
  results: readonly Result<CONTENT, InstallationError>[]
): Result<readonly CONTENT[], InstallationError> {
  const failure = results.find(isErr)
  if (failure) {
    return failure
  }
  return ok(
    results.flatMap((result) => {
      if (isErr(result)) {
        return []
      }
      return [result.value]
    })
  )
}
