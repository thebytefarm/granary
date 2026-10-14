import { uniq } from 'massaman/array'
import { z } from 'zod'

import { contentGroupSchema } from '../packs/definition.js'
import { packManifestSchema } from '../packs/manifest.js'
import { relativePathSchema, sourceSchema } from '../sources/source.js'
import { catalogSchema, codeDirectorySchema, repositorySelectionSchema } from '../packs/catalog.js'

const fields = packManifestSchema.unwrap().shape

/**
 * Record one selected pack, its source intent, and its content selection.
 */
export const packRequestSchema = z
  .strictObject({
    name: fields.name,
    source: sourceSchema,
    manifest: relativePathSchema,
    version: fields.version.optional(),
    content: z
      .array(contentGroupSchema)
      .min(1)
      .refine((groups) => uniq(groups).length === groups.length, 'Duplicate content selection')
      .readonly(),
    output: relativePathSchema.optional(),
    codeOutput: codeDirectorySchema.optional(),
    selection: repositorySelectionSchema.optional(),
  })
  .readonly()

/**
 * Record a selected preset independently of its expanded component requests.
 */
export const presetRequestSchema = z
  .strictObject({
    name: fields.name,
    source: sourceSchema,
    manifest: relativePathSchema,
    version: fields.version.optional(),
    output: relativePathSchema.optional(),
    codeOutput: codeDirectorySchema.optional(),
  })
  .readonly()

/**
 * Record portable consumer intent independently of source commits and file hashes.
 * @example
 * projectConfigSchema.safeParse({ packs: [] })
 */
export const projectConfigSchema = z
  .strictObject({
    output: relativePathSchema.default('.context'),
    packs: z.array(packRequestSchema).readonly(),
    presets: z.array(presetRequestSchema).readonly().optional(),
    document: catalogSchema.optional(),
    codeOutput: codeDirectorySchema.optional(),
  })
  .refine((config) => {
    const names = [...config.packs, ...(config.presets ?? [])].map((request) => request.name)
    return uniq(names).length === names.length
  }, 'Duplicate pack identities')
  .readonly()
export type ProjectConfig = z.infer<typeof projectConfigSchema>
export type PackRequest = z.infer<typeof packRequestSchema>
export type PresetRequest = z.infer<typeof presetRequestSchema>
