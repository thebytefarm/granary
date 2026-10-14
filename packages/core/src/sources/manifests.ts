import { err, isErr, ok } from 'massaman/control'
import type { Result } from 'massaman/control'
import { z } from 'zod'

import { installationError } from '../errors.js'
import type { InstallationError } from '../errors.js'
import { findFiles, readBytes } from '../filesystem/file.js'
import { parseJson } from '../filesystem/json.js'
import { checkPath } from '../filesystem/path.js'
import { mapLimited } from '../map-limited.js'
import { CONTENT_GROUPS, packMetadataSchema } from '../packs/definition.js'
import type { ContentGroup, PackMetadata } from '../packs/definition.js'
import {
  buildCatalogComposite,
  buildCatalogLeaf,
  catalogDefinitionBytes,
  catalogSchema,
} from '../packs/catalog.js'
import type { Catalog } from '../packs/catalog.js'
import { presetSchema } from '../packs/preset.js'
import type { Preset } from '../packs/preset.js'
import { createSourceReader } from './reader.js'
import type { Source } from './source.js'

export type AvailablePack = {
  readonly kind: 'pack' | 'preset'
  readonly name: string
  readonly description: string
  readonly manifest: string
  readonly content: readonly ContentGroup[]
}
const catalogMetadataSchema = z.union([catalogSchema, packMetadataSchema, presetSchema])
export type ManifestRecord = {
  readonly metadata: PackMetadata
  readonly bytes: Buffer
  readonly path: string
  readonly hashKind?: 'catalog-v1'
}

/**
 * Find portable bundles and curated definitions in a local or Git source.
 * @param options - Consuming project used as the base for relative local source paths.
 * @returns A catalog, possibly empty, or a failure for invalid definitions or duplicate identities.
 * @example
 * await findPacks({ project: process.cwd(), source: { kind: 'local', path: './contributing' } })
 */
export async function findPacks({
  project,
  source,
}: {
  readonly project: string
  readonly source: Source
}): Promise<Result<readonly AvailablePack[], InstallationError>> {
  return createSourceReader().read({
    source,
    base: project,
    use: (opened) => readAvailablePacks(opened.directory),
  })
}

/**
 * Read and validate one immutable buffer so identity and integrity describe the same bytes.
 */
export async function readManifest({
  root,
  path,
  name,
}: {
  readonly root: string
  readonly path: string
  readonly name?: string
}): Promise<Result<ManifestRecord, InstallationError>> {
  const safe = await checkPath({ root, path })
  if (isErr(safe)) {
    return safe
  }
  const bytes = await readBytes(safe.value)
  if (isErr(bytes)) {
    return bytes
  }
  const metadata = parseJson({
    bytes: bytes.value,
    path,
    schema: z.union([catalogSchema, packMetadataSchema]),
  })
  if (isErr(metadata)) {
    return metadata
  }
  if ('schemaVersion' in metadata.value) {
    const declaration = metadata.value.packs?.[name ?? '']
    if (!declaration || !name) {
      return err(
        installationError({
          kind: 'invalid',
          message: `Missing provider declaration: ${name ?? path}.`,
        })
      )
    }
    const leaf = buildCatalogLeaf({ name, declaration })
    if (isErr(leaf)) {
      return leaf
    }
    return ok({
      metadata: leaf.value,
      bytes: catalogDefinitionBytes({ name, declaration }),
      path: safe.value,
      hashKind: 'catalog-v1',
    })
  }
  return ok({ metadata: metadata.value, bytes: bytes.value, path: safe.value })
}

/**
 * @private
 */
async function readAvailablePacks(
  root: string
): Promise<Result<readonly AvailablePack[], InstallationError>> {
  const rootManifest = await findFiles({ root, patterns: ['granary.json'] })
  if (isErr(rootManifest)) {
    return rootManifest
  }
  if (rootManifest.value.includes('granary.json')) {
    const rootRecord = await readCatalogManifest({ root, path: 'granary.json' })
    if (isErr(rootRecord)) {
      return rootRecord
    }
    if ('schemaVersion' in rootRecord.value.metadata) {
      return ok(describeCatalog({ catalog: rootRecord.value.metadata, manifest: 'granary.json' }))
    }
  }
  const paths = await findFiles({
    root,
    patterns: ['**/granary.json', '**/granary.pack.json', '**/granary.preset.json'],
  })
  if (isErr(paths)) {
    return paths
  }
  const records = await mapLimited({
    items: paths.value,
    concurrency: 4,
    transform: (path) => readCatalogManifest({ root, path }),
  })
  const failed = records.find(isErr)
  if (failed) {
    return failed
  }
  const packs = records.flatMap((record, index) => {
    if (isErr(record)) {
      return []
    }
    const manifest = paths.value[index]
    if (!manifest) {
      return []
    }
    if ('schemaVersion' in record.value.metadata) {
      return describeCatalog({ catalog: record.value.metadata, manifest })
    }
    return [describePack({ metadata: record.value.metadata, manifest })]
  })
  if (packs.some((pack, index) => packs.findIndex((other) => other.name === pack.name) !== index)) {
    return err(
      installationError({ kind: 'invalid', message: 'Source contains duplicate pack identities.' })
    )
  }
  return ok(packs)
}

/**
 * @private
 */
function describePack({
  metadata,
  manifest,
}: {
  readonly metadata: PackMetadata | Preset
  readonly manifest: string
}): AvailablePack {
  if ('packs' in metadata) {
    return {
      kind: 'preset',
      name: metadata.name,
      description: metadata.description,
      manifest,
      content: CONTENT_GROUPS.filter((name) =>
        metadata.packs.some((pack) => pack.content.includes(name))
      ),
    }
  }
  if ('groups' in metadata) {
    return {
      kind: 'pack',
      name: metadata.name,
      description: metadata.description,
      manifest,
      content: CONTENT_GROUPS.filter((name) => metadata.groups[name] !== undefined),
    }
  }
  return {
    kind: 'pack',
    name: metadata.name,
    description: metadata.description,
    manifest,
    content: ['docs'],
  }
}

/**
 * @private
 */
type ReadCatalogManifestParams = {
  readonly root: string
  readonly path: string
}

/**
 * @private
 */
async function readCatalogManifest({
  root,
  path,
}: ReadCatalogManifestParams): Promise<
  Result<{ readonly metadata: PackMetadata | Preset | Catalog }, InstallationError>
> {
  const safe = await checkPath({ root, path })
  if (isErr(safe)) {
    return safe
  }
  const bytes = await readBytes(safe.value)
  if (isErr(bytes)) {
    return bytes
  }
  const metadata = parseJson({ bytes: bytes.value, path, schema: catalogMetadataSchema })
  if (isErr(metadata)) {
    return metadata
  }
  return ok({ metadata: metadata.value })
}

/**
 * @private
 */
type DescribeCatalogParams = { readonly catalog: Catalog; readonly manifest: string }

/**
 * @private
 */
function describeCatalog({ catalog, manifest }: DescribeCatalogParams): readonly AvailablePack[] {
  return Object.entries(catalog.packs ?? {}).map(([name, declaration]) => {
    if ('includes' in declaration) {
      const composite = buildCatalogComposite({ catalog, name, manifest })
      const content = CONTENT_GROUPS.filter(
        (group) =>
          !isErr(composite) && composite.value.packs.some((pack) => pack.content.includes(group))
      )
      return { kind: 'preset', name, description: declaration.description, manifest, content }
    }
    if ('groups' in declaration) {
      return {
        kind: 'pack',
        name,
        description: declaration.description,
        manifest,
        content: CONTENT_GROUPS.filter((group) => declaration.groups[group] !== undefined),
      }
    }
    return { kind: 'pack', name, description: declaration.description, manifest, content: ['docs'] }
  })
}
