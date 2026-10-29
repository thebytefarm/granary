import { z } from 'zod'

import { documentKindsSchema } from '#/content/metadata.ts'
import {
  relativePathSchema,
  refSchema,
  commitHashSchema,
  sourceRevisionSchema,
} from '#/sources/source.ts'

/**
 * Select arbitrary files with positive include and exclude globs.
 */
export const fileSelectionSchema = z
  .strictObject({
    include: z
      .array(
        relativePathSchema.refine((path) => !path.startsWith('!'), 'Use exclude for negative globs')
      )
      .readonly(),
    exclude: z
      .array(
        relativePathSchema.refine((path) => !path.startsWith('!'), 'Use positive exclusion globs')
      )
      .readonly()
      .optional(),
  })
  .readonly()

/**
 * Describe one inline pack or configured source selection, including recursive members.
 */
export type PackOptions = {
  readonly description?: string | undefined
  readonly version?: string | undefined
  readonly license?: string | undefined
  readonly source?: string | undefined
  readonly files?: z.infer<typeof fileSelectionSchema> | undefined
  readonly documents?: z.infer<typeof documentKindsSchema> | undefined
  readonly output?: string | undefined
  readonly branch?: string | undefined
  readonly tag?: string | undefined
  readonly commit?: string | undefined
  readonly packs?: Readonly<Record<string, PackEntry>> | undefined
}

/**
 * Keep revision shorthand and multiple installations equivalent to expanded options.
 */
export type PackEntry = string | PackOptions | readonly (string | PackOptions)[]

const packKeySchema = z
  .string()
  .trim()
  .min(1)
  .refine(
    (key) =>
      [...key].every(
        (character) =>
          character.charCodeAt(0) > 0x20 && character.charCodeAt(0) !== 0x7f && character !== '\\'
      ) && !key.startsWith('/'),
    'Expected a pack name or portable source locator'
  )

/**
 * Validate recursive pack options without requiring publisher participation.
 */
export const packOptionsSchema: z.ZodType<PackOptions> = z.lazy(() =>
  z
    .strictObject({
      description: z.string().trim().min(1).optional(),
      version: z.string().trim().min(1).optional(),
      license: z.string().trim().min(1).optional(),
      source: z.string().trim().min(1).optional(),
      files: fileSelectionSchema.optional(),
      documents: documentKindsSchema.optional(),
      output: relativePathSchema.optional(),
      branch: refSchema.optional(),
      tag: refSchema.optional(),
      commit: commitHashSchema.optional(),
      packs: z.record(packKeySchema, packEntrySchema).optional(),
    })
    .refine(
      (pack) =>
        [pack.branch, pack.tag, pack.commit].filter((value) => value !== undefined).length <= 1,
      'Choose at most one of branch, tag, or commit'
    )
    .readonly()
)

/**
 * Validate one or more installations under a source or local pack key.
 */
export const packEntrySchema: z.ZodType<PackEntry> = z.lazy(() =>
  z.union([
    refSchema,
    packOptionsSchema,
    z
      .array(z.union([refSchema, packOptionsSchema]))
      .min(1)
      .readonly(),
  ])
)

/**
 * Validate the shared producer and consumer manifest.
 * @example
 * manifestSchema.safeParse({ name: 'app', packs: { 'github:vercel/next.js': 'v16.0.0' } })
 */
export const manifestSchema = z
  .strictObject({
    name: z.string().regex(/^[a-z0-9]+(?:[/-][a-z0-9]+)*$/),
    description: z.string().trim().min(1).optional(),
    version: z.string().trim().min(1).optional(),
    license: z.string().trim().min(1).optional(),
    source: z.string().trim().min(1).optional(),
    files: fileSelectionSchema.optional(),
    documents: documentKindsSchema.optional(),
    output: relativePathSchema.optional(),
    packs: z.record(packKeySchema, packEntrySchema).optional(),
    plugins: z
      .record(z.string().regex(/^[a-z][a-zA-Z0-9]*$/), z.json())
      .readonly()
      .optional(),
  })
  .readonly()

export type Manifest = z.infer<typeof manifestSchema>

/**
 * Pin every visited definition and its composition edges separately from payloads.
 */
export const compositionSchema = z
  .strictObject({
    document: manifestSchema,
    definitions: z
      .array(
        z
          .strictObject({
            id: z.string(),
            path: relativePathSchema,
            origin: sourceRevisionSchema,
            hash: z
              .string()
              .regex(/^[a-f0-9]{64}$/)
              .nullable(),
            members: z.array(z.string()).readonly(),
          })
          .readonly()
      )
      .readonly(),
  })
  .readonly()

export type Composition = z.infer<typeof compositionSchema>
