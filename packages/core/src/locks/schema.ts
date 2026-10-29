import { uniq } from 'massaman/array'
import { z } from 'zod'
import { documentKindsSchema } from '#/content/metadata.ts'
import { isEqual } from 'massaman/predicate'

import { relativePathSchema, sourceRevisionSchema } from '#/sources/source.ts'
import { packRequestSchema, contentGroupSchema, contentPathSchema } from '#/workspace/config.ts'
import { compositionSchema } from '#/manifests/schema.ts'

export const digestSchema = z.string().regex(/^[a-f0-9]{64}$/)
/**
 * Retain accepted local results without replacing upstream file hashes.
 */
export const customizationSchema = z
  .strictObject({
    group: contentGroupSchema,
    path: contentPathSchema,
    content: z.string().nullable(),
    hash: digestSchema.nullable(),
    kind: z.enum(['context', 'standards']).optional(),
  })
  .refine(
    (file) => (file.content === null) === (file.hash === null),
    'Deleted customization content and hash must both be null'
  )
  .readonly()
export const lockedGroupSchema = z
  .strictObject({
    name: contentGroupSchema,
    origin: sourceRevisionSchema,
    root: relativePathSchema,
    entry: contentPathSchema,
    documents: documentKindsSchema.optional(),
    files: z
      .array(z.strictObject({ path: contentPathSchema, hash: digestSchema }).readonly())
      .min(1)
      .readonly(),
  })
  .refine(
    (group) =>
      group.files.some((file) => file.path === group.entry) &&
      uniq(group.files.map((file) => file.path)).length === group.files.length &&
      Object.keys(group.documents ?? {}).every((path) =>
        group.files.some((file) => file.path === path)
      ),
    'Entry must be included and file paths unique'
  )
  .readonly()
export const lockedPackSchema = z
  .strictObject({
    request: packRequestSchema,
    definition: sourceRevisionSchema,
    definitionHash: digestSchema,
    definitionHashKind: z.literal('selection-v1'),
    definitionVersion: z.string().min(1),
    version: z.string().min(1),
    output: relativePathSchema,
    codeOutput: relativePathSchema.optional(),
    groups: z.array(lockedGroupSchema).min(1).readonly(),
    customizations: z.array(customizationSchema).readonly().optional(),
  })
  .refine((pack) => {
    const keys = (pack.customizations ?? []).map((file) => `${file.group}/${file.path}`)
    return (
      uniq(keys).length === keys.length &&
      (pack.customizations ?? []).every((file) =>
        pack.groups.some((group) => group.name === file.group)
      )
    )
  }, 'Customizations must have unique paths in selected groups')
  .refine(
    (pack) =>
      uniq(pack.groups.map((group) => group.name)).length === pack.groups.length &&
      pack.groups.length === pack.request.content.length &&
      pack.groups.every((group) => pack.request.content.includes(group.name)),
    'Locked groups must match requested content'
  )
  .refine(
    (pack) =>
      isEqual(pack.request.source, pack.definition.source) &&
      pack.version === (pack.request.version ?? pack.definition.revision ?? pack.definitionVersion),
    'Locked definition and content version must match consumer intent'
  )
  .readonly()

/**
 * Store concrete source identities, selected content integrity, and managed destinations.
 * @example
 * lockfileSchema.safeParse({ schemaVersion: 1, packs: [] })
 */
export const lockfileSchema = z
  .strictObject({
    schemaVersion: z.literal(1),
    packs: z.array(lockedPackSchema).readonly(),
    composition: compositionSchema.optional(),
  })
  .refine((lock) => {
    const names = lock.packs.map((entry) => entry.request.name)
    return uniq(names).length === names.length
  }, 'Duplicate locked pack identities')
  .readonly()
export type Lockfile = z.infer<typeof lockfileSchema>
export type LockedPack = z.infer<typeof lockedPackSchema>
export type LockedGroup = z.infer<typeof lockedGroupSchema>
export const EMPTY_LOCK: Lockfile = { schemaVersion: 1, packs: [] }
