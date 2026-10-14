import { join } from 'node:path'

import type { LockedGroup, LockedPack } from '../project/lock.js'

/**
 * Place content under versioned directories that preserve full pack identity.
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
  if (group.name === 'code') {
    if (pack.codeOutput !== undefined) {
      return join(pack.codeOutput, pack.request.name, pack.version, path)
    }
    return join(pack.output, 'repos', pack.request.name, pack.version, path)
  }
  return join(pack.output, group.name, pack.request.name, pack.version, path)
}
