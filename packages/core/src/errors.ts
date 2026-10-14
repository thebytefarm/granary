import { err, isErr } from 'massaman/control'
import type { Err, Result } from 'massaman/control'

export type InstallationError = Error & { readonly kind: 'invalid' | 'io' | 'conflict' | 'drift' }

/**
 * Construct a tagged failure without relying on error-message matching.
 */
export function installationError({
  kind,
  message,
  cause,
}: {
  readonly kind: InstallationError['kind']
  readonly message: string
  readonly cause?: unknown
}): InstallationError {
  return Object.assign(new Error(message, { cause }), { kind })
}

/**
 * Translate adapter failures while retaining their original cause.
 */
export function fromIo(result: Err): Err<InstallationError>
export function fromIo<CONTENT>(result: Result<CONTENT>): Result<CONTENT, InstallationError>
export function fromIo<CONTENT>(result: Result<CONTENT>): Result<CONTENT, InstallationError> {
  if (isErr(result)) {
    return err(
      installationError({ kind: 'io', message: result.error.message, cause: result.error })
    )
  }
  return result
}
