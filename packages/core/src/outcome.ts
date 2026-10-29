/**
 * Describe an operation's success or failure without a utility-library dependency.
 * Narrow `ok` before reading `value` or `error`; the opposite field is always null.
 * @example
 * const result: Outcome<string, Error> = { ok: true, value: 'installed', error: null }
 * if (result.ok) console.log(result.value)
 */
export type Outcome<Value, Failure extends Error = Error> =
  | OperationSuccess<Value>
  | OperationFailure<Failure>

/**
 * @private
 */
type OperationSuccess<Value> = {
  readonly ok: true
  readonly value: Value
  readonly error: null
}

/**
 * @private
 */
type OperationFailure<Failure extends Error> = {
  readonly ok: false
  readonly value: null
  readonly error: Failure
}
