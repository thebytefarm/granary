import { join, relative } from 'node:path'

import { uniq, uniqBy } from 'massaman/array'
import { err, isErr, ok } from 'massaman/control'
import type { Result } from 'massaman/control'

import { installationError } from '#/installation/errors.ts'
import type { InstallationError } from '#/installation/errors.ts'
import { hashContent } from '#/content/hash.ts'
import { buildContentDestination } from '#/content/destination.ts'
import type { PackSnapshot } from '#/installation/snapshots.ts'
import { lockedPackSchema, lockfileSchema } from '#/locks/schema.ts'
import type { LockedPack, Lockfile } from '#/locks/schema.ts'
import type { ProjectConfig } from '#/workspace/config.ts'
import { baselineCacheDirectory, granaryIgnorePath } from '#/workspace/paths.ts'

export type FileChange = {
  readonly path: string
  readonly content: Buffer | string | null
  readonly expected?: string | undefined
  readonly expectedAlternatives?: readonly string[]
  readonly replace?: boolean
  readonly expectedMissing?: boolean
}
export type InstallationPlan = { readonly changes: readonly FileChange[]; readonly lock: Lockfile }

/**
 * @private
 */
function formatJson(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`
}

export type ReviewedInstallationOptions = {
  readonly kind: 'reviewed'
  readonly config: ProjectConfig
  readonly lock: Lockfile
  readonly previous: Lockfile
  readonly upstream: readonly PackSnapshot[]
  readonly effective: readonly PackSnapshot[]
  readonly observed: readonly { readonly path: string; readonly hash: string | null }[]
  readonly configHash: string
  readonly lockHash: string
}

/**
 * Plan reviewed payload decisions while retaining upstream baseline bytes independently.
 * @param options - Resolved review results and exact observed metadata and destination hashes.
 * @returns One transaction plan; review interpretation never writes files itself.
 */
export function buildReviewedPlan(
  options: ReviewedInstallationOptions
): Result<InstallationPlan, InstallationError> {
  const { lock, previous, upstream, effective, observed, configHash, lockHash, config } = options
  const plan = buildContentPlan({ lock, previous, snapshots: effective })
  if (isErr(plan)) return plan
  const payload = effective.flatMap((snapshot) =>
    snapshot.groups.flatMap((group) =>
      group.files.map((file) => ({
        path: buildContentDestination({
          pack: snapshot.locked,
          group: group.locked,
          path: file.path,
        }),
        content: file.content,
      }))
    )
  )
  const paths = uniqBy([...observed, ...payload], (file) => file.path).map((file) => file.path)
  const changes: readonly FileChange[] = paths.map((path) => {
    const before = observed.find((file) => file.path === path)
    return {
      path,
      content: payload.find((file) => file.path === path)?.content ?? null,
      expected: before?.hash ?? undefined,
      expectedMissing: before?.hash === undefined || before.hash === null,
    }
  })
  const baselines = upstream.flatMap((snapshot) =>
    snapshot.groups.flatMap((group) =>
      group.files.map((file) => ({
        path: join(baselineCacheDirectory, file.hash),
        content: file.content,
        expected: file.hash,
      }))
    )
  )
  const contentChanges = plan.value.changes.filter(
    (file) =>
      !paths.includes(file.path) && !baselines.some((baseline) => baseline.path === file.path)
  )
  const consumer = buildConsumerChange({
    config: {
      ...config,
      composition: lock.composition ?? config.composition,
      packs: lock.packs.map((pack) => pack.request),
    },
  })
  return ok({
    lock,
    changes: [
      ...changes,
      ...contentChanges,
      ...uniqBy(baselines, (file) => file.path),
      { ...consumer, replace: false, expected: configHash, expectedMissing: false },
      {
        path: 'granary-lock.json',
        content: formatJson(lock),
        expected: lockHash,
        expectedMissing: false,
      },
    ],
  })
}

/**
 * Plan payloads, navigation, and consumer intent as one atomic installation.
 * @param options - Captured new sources and the prior managed installation.
 * @returns Pure write intentions; duplicate shared payloads retain their locked identity.
 */
export function buildAddPlan({
  config,
  previous,
  snapshots,
}: {
  readonly config: ProjectConfig
  readonly previous: Lockfile
  readonly snapshots: readonly PackSnapshot[]
}): Result<InstallationPlan, InstallationError> {
  const changed = snapshots.some((snapshot) => {
    const existing = previous.packs.find(
      (pack) => pack.request.name === snapshot.locked.request.name
    )
    if (!existing) return false
    const before = lockedPackSchema.safeParse({ ...existing, customizations: undefined })
    const incoming = lockedPackSchema.safeParse({ ...snapshot.locked, customizations: undefined })
    return (
      !before.success || !incoming.success || formatJson(before.data) !== formatJson(incoming.data)
    )
  })
  if (changed) {
    return err(
      installationError({
        kind: 'conflict',
        message: 'A shared installation changed upstream. Review an update before adding this set.',
      })
    )
  }
  const additions = snapshots.filter(
    (snapshot) => !previous.packs.some((pack) => pack.request.name === snapshot.locked.request.name)
  )
  const lock: Lockfile = {
    schemaVersion: 1,
    composition: config.composition,
    packs: uniqBy(
      [...previous.packs, ...snapshots.map((snapshot) => snapshot.locked)],
      (pack) => pack.request.name
    ),
  }
  const plan = buildContentPlan({ lock, previous, snapshots: additions })
  if (isErr(plan)) return plan
  return ok({
    ...plan.value,
    changes: [
      ...plan.value.changes,
      buildConsumerChange({ config }),
      { path: 'granary-lock.json', content: formatJson(lock), replace: true },
    ],
  })
}

/**
 * Serialize the current consumer manifest without exposing normalized payload requests.
 * @param options - Resolved manifest intent, not a legacy dependency document.
 * @returns A consumer metadata change whose write policy is assigned by its transaction.
 */
export function buildConsumerChange({ config }: { readonly config: ProjectConfig }): FileChange {
  return { path: 'granary.json', content: formatJson(config.composition.document), replace: true }
}

/**
 * Plan a restore without rewriting intent or advancing locked source identities.
 * @param options - Verified upstream snapshots with separately materialized customizations.
 * @returns Payload and navigation changes with recorded ownership expectations.
 */
export function buildRestorePlan({
  lock,
  snapshots,
}: {
  readonly lock: Lockfile
  readonly snapshots: readonly PackSnapshot[]
}): Result<InstallationPlan, InstallationError> {
  return buildContentPlan({ lock, previous: lock, snapshots })
}

/**
 * Plan payload and navigation changes after validating the resulting lock.
 * @param options - Next lock, prior ownership metadata, and captured content.
 * @returns A no-I/O plan or an invalid-lock failure.
 */
export function buildContentPlan({
  lock,
  previous,
  snapshots,
}: {
  readonly lock: Lockfile
  readonly previous: Lockfile
  readonly snapshots: readonly PackSnapshot[]
}): Result<InstallationPlan, InstallationError> {
  const valid = lockfileSchema.safeParse(lock)
  if (!valid.success)
    return err(installationError({ kind: 'invalid', message: valid.error.message }))
  return ok({
    lock,
    changes: [
      ...buildPayloadChanges({ snapshots, previous }),
      ...buildIndexChanges({ lock, previous }),
      ...buildCodeIgnores({ lock, previous }),
    ],
  })
}

/**
 * @private
 */
function buildCodeIgnores({
  lock,
  previous,
}: {
  readonly lock: Lockfile
  readonly previous: Lockfile
}): readonly FileChange[] {
  const directories = uniq(
    lock.packs.flatMap((pack) => {
      if (!pack.codeOutput || !pack.groups.some((group) => group.name === 'code')) return []
      return [pack.codeOutput]
    })
  )
  return directories.map((directory) => {
    const content = '# Granary repository reference code\n*\n'
    const owned = previous.packs.some(
      (pack) => pack.codeOutput === directory && pack.groups.some((group) => group.name === 'code')
    )
    if (!owned) return { path: join(directory, '.gitignore'), content }
    return { path: join(directory, '.gitignore'), content, expected: hashContent(content) }
  })
}

/**
 * @private
 */
function buildPayloadChanges({
  snapshots,
  previous,
}: {
  readonly snapshots: readonly PackSnapshot[]
  readonly previous: Lockfile
}): readonly FileChange[] {
  const managed = previous.packs.flatMap((pack) => [
    ...pack.groups.flatMap((group) =>
      group.files.map((file) => ({
        path: buildContentDestination({ pack, group, path: file.path }),
        hash:
          pack.customizations?.find(
            (custom) => custom.group === group.name && custom.path === file.path
          )?.hash ?? file.hash,
      }))
    ),
    ...(pack.customizations ?? []).flatMap((file) => {
      const group = pack.groups.find((entry) => entry.name === file.group)
      if (!group || file.hash === null) return []
      return [{ path: buildContentDestination({ pack, group, path: file.path }), hash: file.hash }]
    }),
  ])
  const payload = snapshots.flatMap((snapshot) =>
    snapshot.groups.flatMap((group) =>
      group.files.map((file) => {
        const path = buildContentDestination({
          pack: snapshot.locked,
          group: group.locked,
          path: file.path,
        })
        return {
          path,
          content: file.content,
          expected: managed.find((entry) => entry.path === path)?.hash,
        }
      })
    )
  )
  const baselines = snapshots.flatMap((snapshot) =>
    snapshot.groups.flatMap((group) =>
      group.files
        .filter((file) =>
          group.locked.files.some(
            (upstream) => upstream.path === file.path && upstream.hash === file.hash
          )
        )
        .map((file) => ({
          path: join(baselineCacheDirectory, file.hash),
          content: file.content,
          expected: file.hash,
        }))
    )
  )
  const cacheIgnore = [
    {
      path: granaryIgnorePath,
      content: Buffer.from('*\n'),
      expected: hashContent(Buffer.from('*\n')),
    },
  ]
  const deletions = snapshots.flatMap((snapshot) =>
    (snapshot.locked.customizations ?? []).flatMap((file): readonly FileChange[] => {
      const group = snapshot.locked.groups.find((entry) => entry.name === file.group)
      if (!group || file.content !== null) return []
      return [
        {
          path: buildContentDestination({ pack: snapshot.locked, group, path: file.path }),
          content: null,
          expectedMissing: true,
        },
      ]
    })
  )
  return [...payload, ...deletions, ...uniqBy([...baselines, ...cacheIgnore], (file) => file.path)]
}

/**
 * @private
 */
function buildIndexChanges({
  lock,
  previous,
}: {
  readonly lock: Lockfile
  readonly previous: Lockfile
}): readonly FileChange[] {
  return uniq([...lock.packs, ...previous.packs].map((pack) => pack.output)).map((output) => ({
    path: join(output, 'INDEX.md'),
    content: renderContextIndex({ lock, output }),
    expected: getPreviousIndexHash({ previous, output }),
  }))
}

/**
 * @private
 */
function renderContextIndex({
  lock,
  output,
}: {
  readonly lock: Lockfile
  readonly output: string
}): string {
  const lines = lock.packs
    .filter((pack) => pack.output === output)
    .flatMap((pack) => pack.groups.map((group) => `- ${renderEntryLink({ output, pack, group })}`))
  return `# Granary context\n\nGenerated by Granary. Read the selected entrypoint before searching its files.\n\n${lines.join('\n')}\n`
}

/**
 * @private
 */
function renderEntryLink({
  output,
  pack,
  group,
}: {
  readonly output: string
  readonly pack: LockedPack
  readonly group: LockedPack['groups'][number]
}): string {
  const entry = relative(output, buildContentDestination({ pack, group, path: group.entry }))
    .split('\\')
    .join('/')
  const target = indexLinkTarget(entry)
  return `**${pack.request.label ?? pack.request.name}@${pack.version}** (${group.name}): [${group.entry}](${target})`
}

/**
 * @private
 */
function indexLinkTarget(entry: string): string {
  if (/[\s()<>]/.test(entry)) return `<${entry}>`
  return entry
}

/**
 * @private
 */
function getPreviousIndexHash({
  previous,
  output,
}: {
  readonly previous: Lockfile
  readonly output: string
}): string | undefined {
  if (!previous.packs.some((pack) => pack.output === output)) return undefined
  return hashContent(renderContextIndex({ lock: previous, output }))
}
