import { uniq } from 'massaman/array'
import { err, isErr, ok } from 'massaman/control'
import type { Result } from 'massaman/control'
import { z } from 'zod'

import { installationError } from '../errors.js'
import type { InstallationError } from '../errors.js'
import { relativePathSchema, sourceSchema } from '../sources/source.js'
import type { Source } from '../sources/source.js'
import { CONTENT_GROUPS, packDefinitionSchema } from './definition.js'
import type { PackDefinition } from './definition.js'
import { packManifestSchema } from './manifest.js'
import type { Preset } from './preset.js'

const fields = packManifestSchema.unwrap().shape
const identityVersionSchema = z.string().refine((value) => {
  const [name, version, extra] = value.split('@')
  return (
    extra === undefined &&
    fields.name.safeParse(name).success &&
    fields.version.safeParse(version).success
  )
}, 'Expected name@exact-version')
const sourceLocatorSchema = z
  .string()
  .refine(
    (value) => !isErr(parseSourceLocator(value)),
    'Expected file:<path> or git+<repository>[#ref]'
  )
const metadataFields = { version: fields.version, description: fields.description }
export const codeDirectorySchema = relativePathSchema.refine(
  (path) => /^\.[^./][^/]*(?:\/.*)?$/.test(path),
  'Repository code must use a hidden project-relative directory'
)
export const repositorySelectionSchema = z
  .partialRecord(
    z.enum(CONTENT_GROUPS),
    z
      .strictObject({
        path: relativePathSchema.default('.'),
        entry: fields.entry,
        files: fields.files,
      })
      .readonly()
  )
  .refine((groups) => Object.keys(groups).length > 0, 'Expected selected repository content')
  .readonly()
const leafSchema = z
  .strictObject({
    ...metadataFields,
    path: relativePathSchema,
    entry: fields.entry,
    files: fields.files,
  })
  .readonly()
const advancedLeafSchema = z
  .strictObject({
    ...metadataFields,
    groups: packDefinitionSchema.unwrap().shape.groups,
    versions: packDefinitionSchema.unwrap().shape.versions,
  })
  .readonly()
const externalMemberSchema = z
  .strictObject({
    name: fields.name,
    source: sourceLocatorSchema,
    version: fields.version,
    manifest: relativePathSchema.default('granary.json'),
    content: z.array(z.enum(CONTENT_GROUPS)).min(1).readonly().optional(),
  })
  .readonly()
const compositeSchema = z
  .strictObject({
    ...metadataFields,
    includes: z
      .array(z.union([identityVersionSchema, externalMemberSchema]))
      .min(1)
      .readonly(),
  })
  .readonly()
const dependencySchema = z
  .strictObject({
    source: sourceLocatorSchema,
    version: fields.version.optional(),
    content: z.array(z.enum(CONTENT_GROUPS)).min(1).readonly().optional(),
    installDir: relativePathSchema.optional(),
    codeDir: codeDirectorySchema.optional(),
    selection: repositorySelectionSchema.optional(),
  })
  .readonly()

/**
 * Validate named provider declarations independently of consumer dependency intent.
 */
export const catalogSchema = z
  .strictObject({
    schemaVersion: z.literal(1),
    packs: z
      .record(fields.name, z.union([leafSchema, advancedLeafSchema, compositeSchema]))
      .optional(),
    dependencies: z.record(fields.name, dependencySchema).optional(),
    installDir: relativePathSchema.optional(),
    codeDir: codeDirectorySchema.optional(),
  })
  .superRefine((catalog, ctx) => {
    if (
      Object.keys(catalog.packs ?? {}).length + Object.keys(catalog.dependencies ?? {}).length ===
      0
    ) {
      ctx.addIssue({ code: 'custom', message: 'Expected provided packs or selected dependencies' })
    }
    for (const [name, declaration] of Object.entries(catalog.packs ?? {})) {
      if (!('includes' in declaration)) {
        continue
      }
      const names = declaration.includes.map((member) => {
        if (typeof member === 'string') {
          return member.split('@')[0]
        }
        return member.name
      })
      if (uniq(names).length !== names.length || names.includes(name)) {
        ctx.addIssue({
          code: 'custom',
          path: ['packs', name, 'includes'],
          message: 'Composite members must have unique identities different from the composite',
        })
      }
      for (const member of declaration.includes) {
        if (typeof member !== 'string') {
          continue
        }
        const [identity, version] = member.split('@')
        const leaf = catalog.packs?.[identity ?? '']
        if (!leaf || 'includes' in leaf || leaf.version !== version) {
          ctx.addIssue({
            code: 'custom',
            path: ['packs', name, 'includes'],
            message: `Expected a declared leaf at ${member}`,
          })
        }
      }
    }
  })
  .readonly()
export type Catalog = z.infer<typeof catalogSchema>
export type CatalogDeclaration = NonNullable<Catalog['packs']>[string]
export type BuildCatalogLeafParams = {
  readonly name: string
  readonly declaration: CatalogDeclaration
}
export type BuildCatalogCompositeParams = {
  readonly catalog: Catalog
  readonly name: string
  readonly manifest: string
}
export type RepositoryDefinitionBytesParams = {
  readonly name: string
  readonly selection: z.infer<typeof repositorySelectionSchema> | undefined
}

/**
 * Normalize explicit locators without assuming a hosted registry.
 * @param locator - A file path or Git repository locator with an optional ref.
 * @returns Typed source intent or an invalid-locator failure.
 */
export function parseSourceLocator(locator: string): Result<Source, InstallationError> {
  if (locator.startsWith('file:')) {
    const parsed = sourceSchema.safeParse({ kind: 'local', path: locator.slice(5) })
    if (parsed.success) {
      return ok(parsed.data)
    }
  }
  if (locator.startsWith('git+')) {
    const [repository, ref, extra] = locator.slice(4).split('#')
    if (extra !== undefined) {
      return err(
        installationError({ kind: 'invalid', message: `Invalid Git locator: ${locator}.` })
      )
    }
    const parsed = sourceSchema.safeParse({ kind: 'git', repository, ref: ref ?? 'HEAD' })
    if (parsed.success) {
      return ok(parsed.data)
    }
  }
  return err(
    installationError({ kind: 'invalid', message: `Unsupported source locator: ${locator}.` })
  )
}

/**
 * Adapt a named leaf to the existing separate-source content model.
 * @param options - Map-key identity and its validated provider declaration.
 * @returns A leaf definition; composites return an invalid-selection failure.
 */
export function buildCatalogLeaf({
  name,
  declaration,
}: BuildCatalogLeafParams): Result<PackDefinition, InstallationError> {
  if ('includes' in declaration) {
    return err(
      installationError({ kind: 'invalid', message: `Composite ${name} cannot be used as a leaf.` })
    )
  }
  if ('groups' in declaration) {
    return ok({ name, ...declaration })
  }
  return ok({
    name,
    version: declaration.version,
    description: declaration.description,
    versions: {},
    groups: {
      docs: {
        source: { kind: 'local', path: '.' },
        root: declaration.path,
        entry: declaration.entry,
        files: declaration.files,
      },
    },
  })
}

/**
 * Adapt ordered composite references to legacy preset requests.
 * @param options - Validated catalog and selected composite identity and manifest path.
 * @returns Ordered leaf requests without importing the producer's dependencies.
 */
export function buildCatalogComposite({
  catalog,
  name,
  manifest,
}: BuildCatalogCompositeParams): Result<Preset, InstallationError> {
  const declaration = catalog.packs?.[name]
  if (!declaration || !('includes' in declaration)) {
    return err(
      installationError({ kind: 'invalid', message: `Missing composite declaration: ${name}.` })
    )
  }
  const members = declaration.includes.map((member) => {
    if (typeof member === 'string') {
      const [identity, version] = member.split('@')
      const leaf = catalog.packs?.[identity ?? '']
      const content = CONTENT_GROUPS.filter(
        (group) =>
          leaf &&
          (('groups' in leaf && leaf.groups[group] !== undefined) ||
            ('path' in leaf && group === 'docs'))
      )
      return {
        name: identity ?? '',
        version: version ?? '',
        source: { kind: 'local' as const, path: '.' },
        manifest,
        content,
      }
    }
    const source = parseSourceLocator(member.source)
    if (isErr(source)) {
      return undefined
    }
    return {
      name: member.name,
      version: member.version,
      source: source.value,
      manifest: member.manifest,
      content: member.content ?? ['docs' as const],
    }
  })
  if (members.some((member) => member === undefined)) {
    return err(installationError({ kind: 'invalid', message: `Invalid member source in ${name}.` }))
  }
  return ok({
    name,
    version: declaration.version,
    description: declaration.description,
    packs: members.filter((member) => member !== undefined),
  })
}

/**
 * Serialize only the selected provider declaration with stable object-key ordering.
 * @param options - Identity and declaration; array order remains significant.
 * @returns Canonical bytes independent of consumer settings and other declarations.
 */
export function catalogDefinitionBytes({ name, declaration }: BuildCatalogLeafParams): Buffer {
  return Buffer.from(JSON.stringify(canonicalValue({ name, declaration })))
}

/**
 * Serialize consumer-owned repository selections independently of object-key order.
 * @param options - Consumer identity and explicit repository content selection.
 * @returns Stable bytes for selection-based lock integrity.
 */
export function repositoryDefinitionBytes({
  name,
  selection,
}: RepositoryDefinitionBytesParams): Buffer {
  return Buffer.from(JSON.stringify(canonicalValue({ name, selection })))
}

/**
 * @private
 */
function canonicalValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(canonicalValue)
  }
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .toSorted(([left], [right]) => {
          if (left < right) {
            return -1
          }
          if (left > right) {
            return 1
          }
          return 0
        })
        .map(([key, entry]) => [key, canonicalValue(entry)])
    )
  }
  return value
}
