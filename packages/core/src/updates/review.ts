import { uniq, uniqBy } from 'massaman/array'
import { err, isErr, ok } from 'massaman/control'
import type { Result } from 'massaman/control'
import { z } from 'zod'

import { installationError } from '#/installation/errors.ts'
import type { InstallationError } from '#/installation/errors.ts'
import { createFilesystemClient } from '#/filesystem.ts'
import { createInstallationClient } from '#/installation/client.ts'
import { buildContentDestination } from '#/content/destination.ts'
import { hashContent } from '#/content/hash.ts'
import { collectOutcomes } from '#/results.ts'
import type { PackSnapshot } from '#/installation/client.ts'
import { mapLimited } from '#/map-limited.ts'
import { packRequestSchema } from '#/workspace/config.ts'
import { compositionSchema } from '#/manifests/schema.ts'
import { resolveWorkspaceConfig } from '#/workspace/read.ts'
import type { ProjectConfig } from '#/workspace/config.ts'
import { checkProjectConsistency } from '#/workspace/consistency.ts'
import { digestSchema, lockedPackSchema, lockfileSchema } from '#/locks/schema.ts'
import { readLockfile } from '#/locks/read.ts'
import type { LockedPack, Lockfile } from '#/locks/schema.ts'
import { relativePathSchema } from '#/sources/source.ts'
import { validateUpdate } from '#/plugins/validation.ts'
import type { UpdateValidator } from '#/plugins/validation.ts'
import { compareFiles, readBaseline, readLocalFiles, snapshotFiles } from '#/updates/comparison.ts'

const reviewFileSchema = z
  .strictObject({
    path: relativePathSchema,
    kind: z.enum(['unchanged', 'upstream', 'local', 'identical', 'conflict']),
    encoding: z.enum(['utf8', 'base64']),
    baseline: z.string().nullable(),
    local: z.string().nullable(),
    incoming: z.string().nullable(),
    decision: z.enum(['incoming', 'local', 'merge', 'defer']),
    merged: z.string().nullable().optional(),
  })
  .readonly()

/**
 * Validate a portable review artifact; applying it still verifies local state and every content hash.
 */
export const updateReviewSchema = z
  .strictObject({
    schemaVersion: z.literal(1),
    lockHash: digestSchema,
    configPath: z.literal('granary.json'),
    configHash: digestSchema,
    composition: compositionSchema,
    packs: z
      .array(
        z
          .strictObject({
            name: packRequestSchema.unwrap().shape.name,
            incoming: lockedPackSchema.nullable(),
            files: z.array(reviewFileSchema).readonly(),
          })
          .readonly()
      )
      .readonly(),
  })
  .readonly()

/**
 * Describe editable per-file decisions and pinned candidate content, bound to a consumer's current state.
 */
export type UpdateReview = z.infer<typeof updateReviewSchema>

/**
 * Capture candidate packs and complete three-way file versions for deliberate review.
 * @param options - Current consumer intent; candidate sources come from granary.json.
 * @returns A self-contained review; no consumer files or lock intent are changed.
 * @example
 * await prepareUpdate({ project: process.cwd(), config })
 */
export async function prepareUpdate({
  project,
  config,
}: {
  readonly project: string
  readonly config: ProjectConfig
}): Promise<Result<UpdateReview, InstallationError>> {
  return prepareDeclaredUpdate({ project, config })
}

/**
 * Apply explicit review decisions only while the captured project state still matches.
 * @param options - Current consumer intent and a validated review artifact, not executable configuration.
 * @returns Updated upstream lock metadata with separately materialized customizations, or a no-overwrite failure.
 * @example
 * await applyUpdate({ project: process.cwd(), config, review })
 */
export async function applyUpdate({
  project,
  config,
  review,
  validators = [],
}: {
  readonly project: string
  readonly config: ProjectConfig
  readonly review: UpdateReview
  readonly validators?: readonly UpdateValidator[]
}): Promise<Result<Lockfile, InstallationError>> {
  const parsed = updateReviewSchema.safeParse(review)
  if (!parsed.success) {
    return invalid(parsed.error.message)
  }
  const previous = await readLockfile({ project, required: true })
  if (isErr(previous)) {
    return previous
  }
  const consistent = checkProjectConsistency({ config, lock: previous.value })
  if (isErr(consistent)) {
    return consistent
  }
  const metadata = await readMetadata({ project })
  if (isErr(metadata)) {
    return metadata
  }
  if (
    metadata.value.lockHash !== review.lockHash ||
    metadata.value.configHash !== review.configHash
  ) {
    return invalid(
      'Review is stale: consumer configuration or lock changed. Generate a new review.'
    )
  }
  if (uniqBy(review.packs, (pack) => pack.name).length !== review.packs.length) {
    return invalid('Duplicate reviewed pack identities.')
  }
  const resolved = collectOutcomes(
    await mapLimited({
      items: review.packs,
      concurrency: 2,
      transform: (pack) =>
        resolveReviewedPack({
          project,
          before: previous.value.packs.find((entry) => entry.request.name === pack.name),
          pack,
        }),
    })
  )
  if (isErr(resolved)) {
    return resolved
  }
  const replacements = resolved.value.flatMap((entry) => {
    if (!entry.snapshot) {
      return []
    }
    return [entry.snapshot]
  })
  const lock = lockfileSchema.safeParse({
    schemaVersion: 1,
    composition: review.composition,
    packs: [
      ...previous.value.packs.filter(
        (pack) => !review.packs.some((entry) => entry.name === pack.request.name)
      ),
      ...replacements.map((entry) => entry.locked),
    ],
  })
  if (!lock.success) {
    return invalid(lock.error.message)
  }
  const installation = createInstallationClient({ project })
  const effective = collectOutcomes(
    await mapLimited({ items: replacements, concurrency: 2, transform: installation.materialize })
  )
  if (isErr(effective)) {
    return effective
  }
  const enforcement = await validateUpdate({
    validators,
    upstream: replacements,
    effective: effective.value,
    configuration: (config.pending ?? config.composition.document).plugins ?? {},
    names: review.packs.map((pack) => pack.name),
  })
  if (isErr(enforcement)) {
    return enforcement
  }
  const prepared = await installation.prepare({
    kind: 'reviewed',
    config,
    lock: lock.data,
    previous: previous.value,
    upstream: replacements,
    effective: effective.value,
    observed: resolved.value.flatMap((entry) => entry.observed),
    configHash: review.configHash,
    lockHash: review.lockHash,
  })
  if (isErr(prepared)) return prepared
  return installation.apply(prepared.value)
}

/**
 * @private
 */
type PrepareDeclaredUpdateParams = { readonly project: string; readonly config: ProjectConfig }

/**
 * @private
 */
async function prepareDeclaredUpdate({
  project,
  config,
}: PrepareDeclaredUpdateParams): Promise<Result<UpdateReview, InstallationError>> {
  if (!config.composition) {
    return invalid('Missing composition consumer intent.')
  }
  const current = await readLockfile({ project, required: true })
  if (isErr(current)) {
    return current
  }
  const consistent = checkProjectConsistency({ config, lock: current.value })
  if (isErr(consistent)) {
    return consistent
  }
  const candidate = await resolveWorkspaceConfig({
    project,
    document: config.pending ?? config.composition.document,
  })
  if (isErr(candidate)) {
    return candidate
  }
  const incoming = collectOutcomes(
    await mapLimited({
      items: candidate.value.packs,
      concurrency: 2,
      transform: async (request) => {
        return createInstallationClient({ project }).capture({
          request,
          output: candidate.value.output,
        })
      },
    })
  )
  if (isErr(incoming)) {
    return incoming
  }
  const names = uniq([
    ...current.value.packs.map((pack) => pack.request.name),
    ...incoming.value.map((snapshot) => snapshot.locked.request.name),
  ])
  const packs = collectOutcomes(
    await mapLimited({
      items: names,
      concurrency: 2,
      transform: (name) =>
        reviewCandidatePack({
          project,
          name,
          before: current.value.packs.find((pack) => pack.request.name === name),
          incoming: incoming.value.find((snapshot) => snapshot.locked.request.name === name),
        }),
    })
  )
  if (isErr(packs)) {
    return packs
  }
  const metadata = await readMetadata({ project })
  if (isErr(metadata)) {
    return metadata
  }
  return ok({
    schemaVersion: 1,
    configPath: 'granary.json',
    ...metadata.value,
    composition: candidate.value.composition,
    packs: packs.value,
  })
}

/**
 * @private
 */
type ReviewCandidatePackParams = {
  readonly project: string
  readonly name: string
  readonly before: LockedPack | undefined
  readonly incoming: PackSnapshot | undefined
}

/**
 * @private
 */
async function reviewCandidatePack({
  project,
  name,
  before,
  incoming,
}: ReviewCandidatePackParams): Promise<Result<UpdateReview['packs'][number], InstallationError>> {
  const baseline = await optionalBaseline({ project, pack: before })
  if (isErr(baseline)) {
    return baseline
  }
  const local = await optionalLocal({ project, pack: before })
  if (isErr(local)) {
    return local
  }
  const files = compareFiles({
    baseline: baseline.value,
    local: local.value,
    incoming: incomingFiles(incoming),
  }).map((file) => ({ ...file, decision: defaultDecision(file.kind) }))
  return ok({ name, incoming: incoming?.locked ?? null, files })
}

/**
 * @private
 */
async function resolveReviewedPack({
  project,
  before,
  pack,
}: {
  readonly project: string
  readonly before: LockedPack | undefined
  readonly pack: UpdateReview['packs'][number]
}): Promise<
  Result<
    {
      readonly snapshot: PackSnapshot | null
      readonly observed: readonly { readonly path: string; readonly hash: string | null }[]
    },
    InstallationError
  >
> {
  if (pack.incoming && pack.incoming.request.name !== pack.name) {
    return invalid('Incoming identity differs from reviewed identity.')
  }
  if (pack.incoming?.customizations?.length) {
    return invalid('Incoming upstream metadata cannot contain local customizations.')
  }
  if (
    pack.files.some(
      (file) =>
        file.decision === 'defer' || (file.decision === 'merge' && file.merged === undefined)
    )
  ) {
    return invalid(
      `Unresolved decisions in ${pack.name}. Choose incoming, local, or provide merged content.`
    )
  }
  if (uniqBy(pack.files, (file) => file.path).length !== pack.files.length) {
    return invalid('Duplicate reviewed file paths.')
  }
  const local = await optionalLocal({ project, pack: before })
  if (isErr(local)) {
    return local
  }
  const baselineFiles =
    before?.groups.flatMap((group) =>
      group.files.map((file) => ({ ...file, key: `${group.name}/${file.path}` }))
    ) ?? []
  const incomingFiles =
    pack.incoming?.groups.flatMap((group) =>
      group.files.map((file) => ({ ...file, group: group.name, key: `${group.name}/${file.path}` }))
    ) ?? []
  const expectedPaths = uniqBy(
    [
      ...baselineFiles.map((file) => ({ path: file.key })),
      ...incomingFiles.map((file) => ({ path: file.key })),
      ...local.value,
    ],
    (file) => file.path
  ).map((file) => file.path)
  if (
    expectedPaths.length !== pack.files.length ||
    expectedPaths.some((path) => !pack.files.some((file) => file.path === path))
  ) {
    return invalid('Review no longer covers the complete payload. Generate a new review.')
  }
  const valid = collectOutcomes(
    pack.files.map((file) => {
      const baseline = decode(file.baseline, file.encoding)
      const incoming = decode(file.incoming, file.encoding)
      const observed = local.value.find((entry) => entry.path === file.path)?.bytes ?? null
      if (
        digest(baseline) !==
          (baselineFiles.find((entry) => entry.key === file.path)?.hash ?? null) ||
        digest(incoming) !== (incomingFiles.find((entry) => entry.key === file.path)?.hash ?? null)
      ) {
        return invalid(`Reviewed content does not match upstream hashes: ${file.path}`)
      }
      if (digest(decode(file.local, file.encoding)) !== digest(observed)) {
        return invalid(`Review is stale: local content changed at ${file.path}.`)
      }
      if (
        [file.baseline, file.local, file.incoming, file.merged].some(
          (content) =>
            typeof content === 'string' &&
            file.encoding === 'base64' &&
            Buffer.from(content, 'base64').toString('base64') !== content
        )
      ) {
        return invalid(`Invalid base64 content: ${file.path}`)
      }
      return ok(undefined)
    })
  )
  if (isErr(valid)) {
    return valid
  }
  const observed = pack.files.flatMap((file) => {
    const [name, ...parts] = file.path.split('/')
    const group = before?.groups.find((entry) => entry.name === name)
    if (!before || !group) {
      return []
    }
    return [
      {
        path: buildContentDestination({ pack: before, group, path: parts.join('/') }),
        hash: digest(decode(file.local, file.encoding)),
      },
    ]
  })
  if (!pack.incoming) {
    if (pack.files.some((file) => chosenContent(file) !== null)) {
      return invalid(
        `Removed pack ${pack.name} still has retained files. Defer this pack's removal instead of discarding its provenance.`
      )
    }
    return ok({ snapshot: null, observed })
  }
  const upstream: PackSnapshot = {
    locked: pack.incoming,
    groups: pack.incoming.groups.map((group) => ({
      locked: group,
      files: group.files.map((file) => ({
        ...file,
        content:
          decode(
            pack.files.find((entry) => entry.path === `${group.name}/${file.path}`)?.incoming ??
              null,
            pack.files.find((entry) => entry.path === `${group.name}/${file.path}`)?.encoding ??
              'utf8'
          ) ?? Buffer.alloc(0),
      })),
    })),
  }
  const customizations = pack.files.flatMap((file) => {
    const content = chosenContent(file)
    if (digest(content) === digest(decode(file.incoming, file.encoding))) {
      return []
    }
    const [name, ...parts] = file.path.split('/')
    const group = pack.incoming?.groups.find((entry) => entry.name === name)
    if (!group) {
      return []
    }
    const kind =
      group.documents?.[parts.join('/')] ??
      before?.customizations?.find(
        (custom) => custom.group === name && custom.path === parts.join('/')
      )?.kind ??
      before?.groups.find((entry) => entry.name === name)?.documents?.[parts.join('/')]
    return [
      {
        group: group.name,
        path: parts.join('/'),
        content: content?.toString('base64') ?? null,
        hash: digest(content),
        kind,
      },
    ]
  })
  if (
    pack.files.some(
      (file) =>
        chosenContent(file) !== null &&
        !pack.incoming?.groups.some((group) => file.path.startsWith(`${group.name}/`))
    )
  ) {
    return invalid('Retaining content from a removed group requires a separate local pack.')
  }
  return ok({ snapshot: { ...upstream, locked: { ...upstream.locked, customizations } }, observed })
}

/**
 * @private
 */
function chosenContent(file: UpdateReview['packs'][number]['files'][number]): Buffer | null {
  if (file.decision === 'local') {
    return decode(file.local, file.encoding)
  }
  if (file.decision === 'merge') {
    return decode(file.merged ?? null, file.encoding)
  }
  return decode(file.incoming, file.encoding)
}

/**
 * @private
 */
function decode(content: string | null, encoding: 'utf8' | 'base64'): Buffer | null {
  if (content === null) {
    return null
  }
  return Buffer.from(content, encoding)
}

/**
 * @private
 */
function digest(content: Buffer | null): string | null {
  if (content === null) {
    return null
  }
  return hashContent(content)
}

/**
 * @private
 */
function defaultDecision(kind: string): 'incoming' | 'local' | 'defer' {
  if (kind === 'conflict') {
    return 'defer'
  }
  if (kind === 'local') {
    return 'local'
  }
  return 'incoming'
}

/**
 * @private
 */
async function optionalBaseline({
  project,
  pack,
}: {
  readonly project: string
  readonly pack: LockedPack | undefined
}): Promise<
  Result<readonly { readonly path: string; readonly bytes: Buffer }[], InstallationError>
> {
  if (!pack) {
    return ok([])
  }
  return readBaseline({ project, pack })
}

/**
 * @private
 */
async function optionalLocal({
  project,
  pack,
}: {
  readonly project: string
  readonly pack: LockedPack | undefined
}): Promise<
  Result<readonly { readonly path: string; readonly bytes: Buffer }[], InstallationError>
> {
  if (!pack) {
    return ok([])
  }
  return readLocalFiles({ project, pack })
}

/**
 * @private
 */
function incomingFiles(
  snapshot: PackSnapshot | undefined
): readonly { readonly path: string; readonly bytes: Buffer }[] {
  if (!snapshot) {
    return []
  }
  return snapshotFiles(snapshot)
}

/**
 * @private
 */
async function readMetadata({
  project,
}: {
  readonly project: string
}): Promise<Result<{ readonly lockHash: string; readonly configHash: string }, InstallationError>> {
  const filesystem = createFilesystemClient({ root: project })
  const bytes = collectOutcomes(
    await Promise.all(
      ['granary-lock.json', 'granary.json'].map((path) => filesystem.read({ path }))
    )
  )
  if (isErr(bytes)) {
    return bytes
  }
  const [lock, config] = bytes.value
  if (!lock || !config) {
    return invalid('Missing consumer metadata.')
  }
  return ok({ lockHash: hashContent(lock), configHash: hashContent(config) })
}

/**
 * @private
 */
function invalid(message: string): Result<never, InstallationError> {
  return err(installationError({ kind: 'invalid', message }))
}
