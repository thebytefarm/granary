import { z } from 'zod'

import { relativePathSchema, sourceSchema, refSchema } from '../sources/source.js'
import { packManifestSchema } from './manifest.js'

export const CONTENT_GROUPS = ['docs', 'code', 'examples'] as const
export const contentGroupSchema = z.enum(CONTENT_GROUPS)
export type ContentGroup = z.infer<typeof contentGroupSchema>
const fields = packManifestSchema.unwrap().shape

/**
 * Describe curated material separately from downloaded payloads.
 * @example
 * packDefinitionSchema.safeParse({
 *   name: 'example/reference', version: '0.1.0', description: 'Local documentation.',
 *   groups: { docs: { source: { kind: 'local', path: '.' }, entry: 'README.md', files: ['README.md'] } },
 * })
 */
export const packDefinitionSchema = z
  .strictObject({
    name: fields.name,
    version: fields.version,
    description: fields.description,
    groups: z
      .partialRecord(
        contentGroupSchema,
        z
          .strictObject({
            source: sourceSchema,
            root: relativePathSchema.default('.'),
            entry: fields.entry,
            files: fields.files,
          })
          .readonly()
      )
      .refine((groups) => Object.keys(groups).length > 0, 'Expected at least one content group'),
    versions: z.record(fields.version, z.partialRecord(contentGroupSchema, refSchema)).default({}),
  })
  .readonly()

export type PackDefinition = z.infer<typeof packDefinitionSchema>
export const packMetadataSchema = z.union([packManifestSchema, packDefinitionSchema])
export type PackMetadata = z.infer<typeof packMetadataSchema>

/**
 * Normalize an existing bundle into one docs group without changing its contract.
 */
export function buildDefinition(metadata: PackMetadata): PackDefinition {
  if ('groups' in metadata) {
    return metadata
  }
  return {
    name: metadata.name,
    description: metadata.description,
    version: metadata.version,
    versions: {},
    groups: {
      docs: {
        source: { kind: 'local', path: '.' },
        root: '.',
        entry: metadata.entry,
        files: metadata.files,
      },
    },
  }
}
