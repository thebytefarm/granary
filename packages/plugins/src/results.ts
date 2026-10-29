import { isErr, ok } from 'massaman/control'
import type { Result } from 'massaman/control'

/**
 * Collect parser outcomes without discarding the first classified failure.
 * @private
 */
export function collectOutcomes<Value, Failure extends Error>(
  results: readonly Result<Value, Failure>[]
): Result<readonly Value[], Failure> {
  const failure = results.find(isErr)
  if (failure) return failure
  return ok(
    results.flatMap((result) => {
      if (isErr(result)) return []
      return [result.value]
    })
  )
}
