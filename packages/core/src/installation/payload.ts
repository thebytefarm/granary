import type { Lockfile } from '../project/lock.js'
import { buildContentDestination } from './destination.js'
import type { FileChange } from './plan.js'
import type { PackSnapshot } from './snapshot.js'

/**
 * Build payload changes with the ownership hashes recorded by the previous installation.
 */
export function buildPayloadChanges({
  snapshots,
  previous,
}: {
  readonly snapshots: readonly PackSnapshot[]
  readonly previous: Lockfile
}): readonly FileChange[] {
  const managed = previous.packs.flatMap((pack) =>
    pack.groups.flatMap((group) =>
      group.files.map((file) => ({
        path: buildContentDestination({ pack, group, path: file.path }),
        hash: file.hash,
      }))
    )
  )
  return snapshots.flatMap((snapshot) =>
    snapshot.groups.flatMap((group) =>
      group.files.map((file) => {
        const path = buildContentDestination({
          pack: snapshot.locked,
          group: group.locked,
          path: file.path,
        })
        return {
          path,
          content: file.content,
          expected: managed.find((entry) => entry.path === path)?.hash,
        }
      })
    )
  )
}
