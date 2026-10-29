import { isErr, ok } from 'massaman/control'
import type { Result } from 'massaman/control'

/**
 * Collect successful stages or return the first failure without changing its type.
 */
export function collectOutcomes<CONTENT, FAILURE extends Error>(
  results: readonly Result<CONTENT, FAILURE>[]
): Result<readonly CONTENT[], FAILURE> {
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
