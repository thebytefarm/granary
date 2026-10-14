import { mapAsync } from 'massaman/array'

export type MapLimitedParams<ITEM, RESULT> = {
  readonly items: readonly ITEM[]
  readonly concurrency: number
  readonly transform: (item: ITEM) => Promise<RESULT>
}

/**
 * Map a collection with a bounded number of concurrent async operations.
 * @param options - Collection, async transform, and positive concurrency limit.
 * @returns A promise for every transformed item in the original order.
 * @example
 * await mapLimited({ items: paths, concurrency: 8, transform: readFileSafe })
 */
export async function mapLimited<ITEM, RESULT>({
  items,
  concurrency,
  transform,
}: MapLimitedParams<ITEM, RESULT>): Promise<readonly RESULT[]> {
  return mapAsync(items, transform, { concurrency })
}
