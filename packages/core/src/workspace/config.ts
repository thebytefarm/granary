import { uniq } from 'massaman/array'
import { z } from 'zod'

import { documentKindsSchema } from '#/content/metadata.ts'
import { compositionSchema, manifestSchema } from '#/manifests/schema.ts'
import { commitHashSchema, relativePathSchema, sourceSchema } from '#/sources/source.ts'
import { defaultContextOutput } from '#/workspace/paths.ts'

/**
 * Validate concrete selected paths rather than authored glob patterns.
 */
export const contentPathSchema = relativePathSchema.refine(
  (path) => !/[*?[\]{}!]/.test(path),
  'Expected a relative file path without glob patterns'
)
export const contentGroupSchema = z.enum(['docs', 'code'])
export type ContentGroup = z.infer<typeof contentGroupSchema>

/**
 * Retain expanded source selections independently of filesystem effects.
 */
export const repositorySelectionSchema = z
  .partialRecord(
    contentGroupSchema,
    z
      .strictObject({
        path: relativePathSchema.default('.'),
        entry: contentPathSchema,
        files: z.array(relativePathSchema).min(1).readonly(),
        exclude: z.array(relativePathSchema).readonly().optional(),
        documents: documentKindsSchema.optional(),
      })
      .readonly()
  )
  .refine((groups) => Object.keys(groups).length > 0, 'Expected selected repository content')
  .readonly()

/**
 * Describe one collision-safe payload resolved from current manifest intent.
 */
export const packRequestSchema = z
  .strictObject({
    name: z.string().regex(/^[a-z0-9]+(?:[/-][a-z0-9]+)*$/),
    source: sourceSchema,
    manifest: relativePathSchema,
    version: z.string().min(1).optional(),
    content: z
      .array(contentGroupSchema)
      .min(1)
      .refine((groups) => uniq(groups).length === groups.length, 'Duplicate content selection')
      .readonly(),
    output: relativePathSchema.optional(),
    codeOutput: relativePathSchema.optional(),
    selection: repositorySelectionSchema,
    revision: commitHashSchema.optional(),
    destination: relativePathSchema.optional(),
    label: z.string().optional(),
  })
  .readonly()

/**
 * Keep resolved workspace intent and pending reviewed edits separate.
 */
export const projectConfigSchema = z
  .strictObject({
    output: relativePathSchema.default(defaultContextOutput),
    packs: z.array(packRequestSchema).readonly(),
    composition: compositionSchema,
    pending: manifestSchema.optional(),
    codeOutput: relativePathSchema.optional(),
  })
  .refine(
    (config) => uniq(config.packs.map((request) => request.name)).length === config.packs.length,
    'Duplicate pack identities'
  )
  .readonly()

export type ProjectConfig = z.infer<typeof projectConfigSchema>
export type PackRequest = z.infer<typeof packRequestSchema>
