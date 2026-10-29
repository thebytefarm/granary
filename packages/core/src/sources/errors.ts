import { err, isErr } from 'massaman/control'
import type { Err, Result } from 'massaman/control'

export type SourceError = Error & { readonly kind: 'invalid' | 'io' | 'conflict' | 'drift' }

/**
 * Construct a source failure without discarding its original cause.
 * @param options - Classified transport, selection, or callback failure.
 * @returns A tagged failure safe for Result propagation.
 */
export function sourceError({
  kind,
  message,
  cause,
}: {
  readonly kind: SourceError['kind']
  readonly message: string
  readonly cause?: unknown
}): SourceError {
  return Object.assign(new Error(message, { cause }), { kind })
}

/**
 * Retain source adapter exceptions as typed I/O outcomes.
 * @param result - Captured filesystem, subprocess, or consumer callback outcome.
 * @returns The original success or a source I/O failure retaining its cause.
 */
export function fromIo(result: Err): Err<SourceError>
export function fromIo<CONTENT>(result: Result<CONTENT>): Result<CONTENT, SourceError>
export function fromIo<CONTENT>(result: Result<CONTENT>): Result<CONTENT, SourceError> {
  if (isErr(result))
    return err(sourceError({ kind: 'io', message: result.error.message, cause: result.error }))
  return result
}
