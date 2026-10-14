import { dirname, isAbsolute, posix, relative, resolve as absolutePath, sep } from 'node:path'

import { err, isErr, ok } from 'massaman/control'
import type { Result } from 'massaman/control'
import { omitBy } from 'massaman/object'
import { isEqual } from 'massaman/predicate'
import { z } from 'zod'

import { installationError } from '../errors.js'
import type { InstallationError } from '../errors.js'
import { readBytes } from '../filesystem/file.js'
import { parseJson } from '../filesystem/json.js'
import { checkPath } from '../filesystem/path.js'
import { checkContentHash, hashContent } from '../installation/integrity.js'
import { collectOutcomes } from '../installation/outcomes.js'
import { presetSchema } from '../packs/preset.js'
import { buildCatalogComposite, catalogDefinitionBytes, catalogSchema } from '../packs/catalog.js'
import { packRequestSchema } from '../project/config.js'
import type { PackRequest, PresetRequest } from '../project/config.js'
import type { LockedPreset } from '../project/lock.js'
import { createSourceReader } from './reader.js'
import type { OpenedSource } from './source.js'

export type ReadPresetParams = {
  readonly project: string
  readonly request: PresetRequest
}
export type CheckLockedPresetParams = {
  readonly project: string
  readonly preset: LockedPreset
}

/**
 * Expand a flat preset into portable component requests and pin its definition.
 * @param options - Consuming project and selected preset source, identity, version, and destination.
 * @returns Ordered component requests with definition integrity, or a selection/source failure.
 */
export async function readPreset({
  project,
  request,
}: ReadPresetParams): Promise<Result<LockedPreset, InstallationError>> {
  return createSourceReader().read({
    source: request.source,
    base: project,
    use: (opened) => capturePreset({ project, request, opened }),
  })
}

/**
 * Verify a preset definition at its recorded revision before restoring components.
 * @param options - Consuming project and preset metadata from its validated lockfile.
 * @returns Success for unchanged definition and membership, or an integrity/source failure.
 */
export async function checkLockedPreset({
  project,
  preset,
}: CheckLockedPresetParams): Promise<Result<void, InstallationError>> {
  return createSourceReader().read({
    ...preset.definition,
    base: project,
    use: async (opened) => {
      const safe = await checkPath({ root: opened.directory, path: preset.request.manifest })
      if (isErr(safe)) {
        return safe
      }
      const bytes = await readBytes(safe.value)
      if (isErr(bytes)) {
        return bytes
      }
      if (preset.definitionHashKind === undefined) {
        const integrity = checkContentHash({
          content: bytes.value,
          hash: preset.definitionHash,
          name: preset.request.name,
        })
        if (isErr(integrity)) {
          return integrity
        }
      }
      const captured = await capturePreset({ project, request: preset.request, opened })
      if (isErr(captured)) {
        return captured
      }
      if (
        captured.value.definitionHash !== preset.definitionHash ||
        captured.value.version !== preset.version ||
        !isEqual(captured.value.members, preset.members)
      ) {
        return err(
          installationError({
            kind: 'drift',
            message: `Locked preset membership differs from its definition: ${preset.request.name}.`,
          })
        )
      }
      return ok(undefined)
    },
  })
}

/**
 * @private
 */
type CapturePresetParams = ReadPresetParams & { readonly opened: OpenedSource }

/**
 * @private
 */
async function capturePreset({
  project,
  request,
  opened,
}: CapturePresetParams): Promise<Result<LockedPreset, InstallationError>> {
  const safe = await checkPath({ root: opened.directory, path: request.manifest })
  if (isErr(safe)) {
    return safe
  }
  const bytes = await readBytes(safe.value)
  if (isErr(bytes)) {
    return bytes
  }
  const parsed = parseJson({
    bytes: bytes.value,
    path: request.manifest,
    schema: z.union([catalogSchema, presetSchema]),
  })
  if (isErr(parsed)) {
    return parsed
  }
  const normalized = normalizePreset({ metadata: parsed.value, request, bytes: bytes.value })
  if (isErr(normalized)) {
    return normalized
  }
  const metadata = normalized.value.metadata
  if (
    metadata.name !== request.name ||
    (request.version !== undefined && request.version !== metadata.version)
  ) {
    return err(
      installationError({
        kind: 'invalid',
        message: `Preset identity or version does not match ${request.name}.`,
      })
    )
  }
  const members = collectOutcomes(
    metadata.packs.map((member) => locateMember({ member, request, opened, project }))
  )
  if (isErr(members)) {
    return members
  }
  return ok({
    request,
    definition: { source: request.source, revision: opened.revision },
    definitionHash: hashContent(normalized.value.bytes),
    ...normalized.value.strategy,
    version: metadata.version,
    members: members.value,
  })
}

/**
 * @private
 */
type NormalizePresetParams = {
  readonly metadata: z.infer<typeof catalogSchema> | z.infer<typeof presetSchema>
  readonly request: PresetRequest
  readonly bytes: Buffer
}

/**
 * @private
 */
function normalizePreset({ metadata, request, bytes }: NormalizePresetParams): Result<
  {
    readonly metadata: z.infer<typeof presetSchema>
    readonly bytes: Buffer
    readonly strategy: { readonly definitionHashKind?: 'catalog-v1' }
  },
  InstallationError
> {
  if (!('schemaVersion' in metadata)) {
    return ok({ metadata, bytes, strategy: {} })
  }
  const composite = buildCatalogComposite({
    catalog: metadata,
    name: request.name,
    manifest: posix.basename(request.manifest),
  })
  const declaration = metadata.packs?.[request.name]
  if (isErr(composite)) {
    return composite
  }
  if (!declaration) {
    return err(
      installationError({ kind: 'invalid', message: `Missing declaration: ${request.name}.` })
    )
  }
  return ok({
    metadata: composite.value,
    bytes: catalogDefinitionBytes({ name: request.name, declaration }),
    strategy: { definitionHashKind: 'catalog-v1' },
  })
}

/**
 * @private
 */
type LocateMemberParams = CapturePresetParams & { readonly member: PackRequest }

/**
 * @private
 */
function locateMember({
  member,
  request,
  opened,
  project,
}: LocateMemberParams): Result<PackRequest, InstallationError> {
  if (
    opened.source.kind === 'git' &&
    member.source.kind === 'local' &&
    (isAbsolute(member.source.path) || /^[A-Za-z]:/.test(member.source.path))
  ) {
    return err(
      installationError({
        kind: 'invalid',
        message: 'Git preset members must use repository-relative local paths.',
      })
    )
  }
  const located = locateMemberSource({ member, request, opened, project })
  const parsed = packRequestSchema.safeParse(
    omitBy(
      {
        ...located,
        output: request.output ?? member.output,
        codeOutput: request.codeOutput ?? member.codeOutput,
      },
      (value) => value === undefined
    )
  )
  if (!parsed.success) {
    return err(installationError({ kind: 'invalid', message: parsed.error.message }))
  }
  return ok(parsed.data)
}

/**
 * @private
 */
function locateMemberSource({ member, request, opened, project }: LocateMemberParams): PackRequest {
  if (member.source.kind === 'git') {
    return member
  }
  if (opened.source.kind === 'git') {
    return {
      ...member,
      source: { ...opened.source, ref: opened.revision ?? opened.source.ref },
      manifest: posix.normalize(
        posix.join(posix.dirname(request.manifest), member.source.path, member.manifest)
      ),
    }
  }
  return {
    ...member,
    source: {
      kind: 'local',
      path:
        relative(
          project,
          absolutePath(project, opened.source.path, dirname(request.manifest), member.source.path)
        )
          .split(sep)
          .join('/') || '.',
    },
  }
}
