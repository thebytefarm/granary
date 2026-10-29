export type StandardsError = Error & { readonly kind: 'invalid' | 'io' | 'conflict' | 'drift' }

/**
 * Construct an interpretation failure while retaining its original cause.
 * @param options - Classified document, identity, or enforcement failure.
 * @returns A standards-owned tagged failure for conversion and review validation.
 */
export function standardsError({
  kind,
  message,
  cause,
}: {
  readonly kind: StandardsError['kind']
  readonly message: string
  readonly cause?: unknown
}): StandardsError {
  return Object.assign(new Error(message, { cause }), { kind })
}
