import { join } from 'node:path'

import type { LockedGroup, LockedPack } from '#/locks/schema.ts'

/**
 * Resolve an installed content path from its locked consumer destination.
 */
export function buildContentDestination({
  pack,
  group,
  path,
}: {
  readonly pack: LockedPack
  readonly group: Pick<LockedGroup, 'name'>
  readonly path: string
}): string {
  if (pack.request.destination !== undefined) {
    return join(pack.request.destination, path)
  }
  if (group.name === 'code') {
    if (pack.codeOutput !== undefined) {
      return join(pack.codeOutput, pack.request.name, pack.version, path)
    }
    return join(pack.output, 'repos', pack.request.name, pack.version, path)
  }
  return join(pack.output, group.name, pack.request.name, pack.version, path)
}
