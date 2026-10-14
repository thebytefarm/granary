import { join } from 'node:path'

import { uniq } from 'massaman/array'
import { isErr, ok } from 'massaman/control'
import type { Result } from 'massaman/control'
import { z } from 'zod'
import { isEqual } from 'massaman/predicate'

import type { InstallationError } from '../errors.js'
import { exists } from '../filesystem/file.js'
import { readJson } from '../filesystem/json.js'
import { checkPath } from '../filesystem/path.js'
import { contentGroupSchema } from '../packs/definition.js'
import { packManifestSchema } from '../packs/manifest.js'
import { commitHashSchema, relativePathSchema, sourceRevisionSchema } from '../sources/source.js'
import { packRequestSchema, presetRequestSchema } from './config.js'

const fields = packManifestSchema.unwrap().shape
export const digestSchema = z.string().regex(/^[a-f0-9]{64}$/)
export const lockedGroupSchema = z
  .strictObject({
    name: contentGroupSchema,
    origin: sourceRevisionSchema,
    root: relativePathSchema,
    entry: fields.entry,
    files: z
      .array(z.strictObject({ path: fields.entry, hash: digestSchema }).readonly())
      .min(1)
      .readonly(),
  })
  .refine(
    (group) =>
      group.files.some((file) => file.path === group.entry) &&
      uniq(group.files.map((file) => file.path)).length === group.files.length,
    'Entry must be included and file paths unique'
  )
  .readonly()
export const lockedPackSchema = z
  .strictObject({
    request: packRequestSchema,
    definition: sourceRevisionSchema,
    definitionHash: digestSchema,
    definitionHashKind: z.enum(['catalog-v1', 'selection-v1']).optional(),
    definitionVersion: fields.version,
    version: z.union([fields.version, commitHashSchema]),
    output: relativePathSchema,
    codeOutput: relativePathSchema.optional(),
    groups: z.array(lockedGroupSchema).min(1).readonly(),
  })
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
 * Pin preset identity, definition integrity, and the ordered component requests.
 */
export const lockedPresetSchema = z
  .strictObject({
    request: presetRequestSchema,
    definition: sourceRevisionSchema,
    definitionHash: digestSchema,
    definitionHashKind: z.literal('catalog-v1').optional(),
    version: fields.version,
    members: z.array(packRequestSchema).min(1).readonly(),
  })
  .refine(
    (preset) =>
      isEqual(preset.request.source, preset.definition.source) &&
      (preset.request.version === undefined || preset.request.version === preset.version) &&
      uniq(preset.members.map((member) => member.name)).length === preset.members.length &&
      preset.members.every(
        (member) => member.name !== preset.request.name && member.version !== undefined
      ),
    'Locked preset identity and ordered members must match consumer intent'
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
    presets: z.array(lockedPresetSchema).readonly().optional(),
  })
  .refine((lock) => {
    const names = [...lock.packs, ...(lock.presets ?? [])].map((entry) => entry.request.name)
    return uniq(names).length === names.length
  }, 'Duplicate locked pack identities')
  .refine(
    (lock) =>
      (lock.presets ?? []).every((preset) =>
        preset.members.every((member) => lock.packs.some((pack) => isEqual(pack.request, member)))
      ),
    'Every preset member must match an installed pack request'
  )
  .readonly()
export type Lockfile = z.infer<typeof lockfileSchema>
export type LockedPack = z.infer<typeof lockedPackSchema>
export type LockedGroup = z.infer<typeof lockedGroupSchema>
export type LockedPreset = z.infer<typeof lockedPresetSchema>
export const EMPTY_LOCK: Lockfile = { schemaVersion: 1, packs: [] }

/**
 * Read locked metadata without fetching upstream material.
 * @param options - Consuming project and whether a missing lockfile is an error.
 * @returns Validated lock metadata; optional missing locks return an empty lockfile.
 * @example
 * await readLockfile({ project: process.cwd(), required: true })
 */
export async function readLockfile({
  project,
  required,
}: {
  readonly project: string
  readonly required: boolean
}): Promise<Result<Lockfile, InstallationError>> {
  const safe = await checkPath({ root: project, path: 'granary-lock.json', allowMissing: true })
  if (isErr(safe)) {
    return safe
  }
  const present = await exists(safe.value)
  if (isErr(present)) {
    return present
  }
  if (!present.value && !required) {
    return ok(EMPTY_LOCK)
  }
  return readJson({ path: join(project, 'granary-lock.json'), schema: lockfileSchema })
}
