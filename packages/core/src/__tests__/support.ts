import assert from 'node:assert/strict'

/**
 * Assert a successful operation in tests without depending on an internal Result type.
 * @private
 */
export function expectSuccess<Value>(
  result:
    | { readonly ok: true; readonly value: Value }
    | { readonly ok: false; readonly error: Error }
): Value {
  if (!result.ok) {
    assert.fail(result.error)
  }
  return result.value
}
