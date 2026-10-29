import assert from 'node:assert/strict'
import { mapAsync } from 'massaman/array'

/**
 * @private
 */
export function expectSuccess<Value>(
  result:
    | { readonly ok: true; readonly value: Value }
    | { readonly ok: false; readonly error: Error }
): Value {
  if (!result.ok) assert.fail(result.error)
  return result.value
}

/**
 * @private
 */
export async function mapLimited<Item, Value>({
  items,
  concurrency,
  transform,
}: {
  readonly items: readonly Item[]
  readonly concurrency: number
  readonly transform: (item: Item) => Promise<Value>
}): Promise<readonly Value[]> {
  return mapAsync(items, transform, { concurrency })
}
