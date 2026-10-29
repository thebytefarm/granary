import { isErr, ok } from 'massaman/control'
import type { Result } from 'massaman/control'

import type { InstallationError } from '#/installation/errors.ts'
import { readSourceDocument } from '#/manifests/read.ts'
import type { PackEntry, PackOptions, Manifest } from '#/manifests/schema.ts'
import { createSourcesClient } from '#/sources/client.ts'
import { isPackLocator } from '#/sources/locator.ts'
import type { Source } from '#/sources/source.ts'

export type AvailablePack = {
  readonly kind: 'pack' | 'preset'
  readonly name: string
  readonly description: string
  readonly manifest: string
  readonly content: readonly ['docs']
}

/**
 * Inspect the root manifest and its declared members, never undisclosed directories.
 * @param options - Source and consumer root used for relative local paths.
 * @returns Declared selections, or no named packs for a manifestless source.
 */
export async function findPacks({
  project,
  source,
}: {
  readonly project: string
  readonly source: Source
}): Promise<Result<readonly AvailablePack[], InstallationError>> {
  return createSourcesClient().read({
    source,
    base: project,
    async use(opened) {
      const loaded = await readSourceDocument({ opened, prefix: '.' })
      if (isErr(loaded)) {
        return loaded
      }
      if (loaded.value.hash === null) {
        return ok([])
      }
      return ok(describeManifest(loaded.value.document))
    },
  })
}

/**
 * @private
 */
function describeManifest(document: Manifest): readonly AvailablePack[] {
  return [
    describePack({ name: document.name, options: document }),
    ...describeMembers({ members: document.packs ?? {} }),
  ]
}

/**
 * @private
 */
function describeMembers({
  members,
  prefix = '',
}: {
  readonly members: Readonly<Record<string, PackEntry>>
  readonly prefix?: string
}): readonly AvailablePack[] {
  return Object.entries(members).flatMap(([key, entry]): readonly AvailablePack[] => {
    if (isPackLocator(key) || typeof entry === 'string' || Array.isArray(entry)) {
      return []
    }
    if (!('files' in entry) && !('packs' in entry) && !('source' in entry)) {
      return []
    }
    const name = `${prefix}${key}`
    return [
      describePack({ name, options: entry }),
      ...describeMembers({ members: entry.packs ?? {}, prefix: `${name}/` }),
    ]
  })
}

/**
 * @private
 */
function describePack({
  name,
  options,
}: {
  readonly name: string
  readonly options: PackOptions
}): AvailablePack {
  if (options.packs && Object.keys(options.packs).length > 0) {
    return {
      name,
      kind: 'preset',
      description: options.description ?? '',
      manifest: 'granary.json',
      content: ['docs'],
    }
  }
  return {
    name,
    kind: 'pack',
    description: options.description ?? '',
    manifest: 'granary.json',
    content: ['docs'],
  }
}
