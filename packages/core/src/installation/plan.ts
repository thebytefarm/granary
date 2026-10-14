import { err, isErr, ok } from 'massaman/control'
import type { Result } from 'massaman/control'

import { installationError } from '../errors.js'
import type { InstallationError } from '../errors.js'
import { formatJson } from '../filesystem/json.js'
import type { ProjectConfig } from '../project/config.js'
import { lockfileSchema } from '../project/lock.js'
import type { LockedPreset, Lockfile } from '../project/lock.js'
import type { Source } from '../sources/source.js'
import { uniq } from 'massaman/array'
import { join } from 'node:path'
import { hashContent } from './integrity.js'
import { buildIndexChanges } from './index.js'
import { buildPayloadChanges } from './payload.js'
import type { PackSnapshot } from './snapshot.js'

export type FileChange = {
  readonly path: string
  readonly content: Buffer | string
  readonly expected?: string | undefined
  readonly expectedAlternatives?: readonly string[]
  readonly replace?: boolean
}
export type InstallationPlan = { readonly changes: readonly FileChange[]; readonly lock: Lockfile }
export type BuildAddPlanParams = {
  readonly config: ProjectConfig
  readonly previous: Lockfile
  readonly snapshots: readonly PackSnapshot[]
  readonly presets?: readonly LockedPreset[]
}

/**
 * Plan a new installation's payloads, navigation, and consumer metadata as one change set.
 */
export function buildAddPlan({
  config,
  previous,
  snapshots,
  presets = [],
}: BuildAddPlanParams): Result<InstallationPlan, InstallationError> {
  const lock: Lockfile = {
    schemaVersion: 1,
    packs: [...previous.packs, ...snapshots.map((snapshot) => snapshot.locked)],
    presets: [...(previous.presets ?? []), ...presets],
  }
  const nextConfig: ProjectConfig = {
    ...config,
    packs: [...config.packs, ...snapshots.map((snapshot) => snapshot.locked.request)],
    presets: [...(config.presets ?? []), ...presets.map((preset) => preset.request)],
  }
  const plan = buildContentPlan({ lock, previous, snapshots })
  if (isErr(plan)) {
    return plan
  }
  return ok({
    ...plan.value,
    changes: [
      ...plan.value.changes,
      buildConsumerChange({ config: nextConfig, snapshots, presets }),
      { path: 'granary-lock.json', content: formatJson(lock), replace: true },
    ],
  })
}

/**
 * @private
 */
type BuildConsumerChangeParams = {
  readonly config: ProjectConfig
  readonly snapshots: readonly PackSnapshot[]
  readonly presets: readonly LockedPreset[]
}

/**
 * @private
 */
function buildConsumerChange({
  config,
  snapshots,
  presets,
}: BuildConsumerChangeParams): FileChange {
  if (!config.document) {
    return { path: 'granary.config.json', content: formatJson(config), replace: true }
  }
  const members = presets.flatMap((preset) => preset.members.map((member) => member.name))
  const composites = presets.map((preset) => [
    preset.request.name,
    {
      ...config.document?.dependencies?.[preset.request.name],
      ...omitDependencyFields({
        source: preset.request.source,
        version: preset.request.version,
        output: preset.request.output,
        content: false,
      }),
      ...optionalCodeDir(preset.request.codeOutput),
    },
  ])
  const leaves = snapshots
    .map((snapshot) => snapshot.locked.request)
    .filter((request) => !members.includes(request.name))
    .map((request) => [
      request.name,
      {
        ...config.document?.dependencies?.[request.name],
        ...omitDependencyFields({
          source: request.source,
          version: request.version,
          output: request.output,
          content: request.content,
        }),
        ...optionalCodeDir(request.codeOutput),
      },
    ])
  const dependencies = Object.fromEntries([...composites, ...leaves])
  return {
    path: 'granary.json',
    content: formatJson({
      ...config.document,
      dependencies: { ...config.document.dependencies, ...dependencies },
    }),
    replace: true,
  }
}

/**
 * @private
 */
type OmitDependencyFieldsParams = {
  readonly source: Source
  readonly version: string | undefined
  readonly output: string | undefined
  readonly content: readonly string[] | false
}

/**
 * @private
 */
function omitDependencyFields({
  source,
  version,
  output,
  content,
}: OmitDependencyFieldsParams): Record<string, unknown> {
  const locator = sourceLocator(source)
  return Object.fromEntries(
    Object.entries({ source: locator, version, installDir: output, content }).filter(
      ([, value]) => value !== undefined && value !== false
    )
  )
}

/**
 * @private
 */
function sourceLocator(source: Source): string {
  if (source.kind === 'local') {
    return `file:${source.path}`
  }
  return `git+${source.repository}#${source.ref}`
}

/**
 * Plan a locked restore without rewriting consumer intent or moving upstream identities.
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
 * @private
 */
function buildContentPlan({
  lock,
  previous,
  snapshots,
}: {
  readonly lock: Lockfile
  readonly previous: Lockfile
  readonly snapshots: readonly PackSnapshot[]
}): Result<InstallationPlan, InstallationError> {
  const valid = lockfileSchema.safeParse(lock)
  if (!valid.success) {
    return err(installationError({ kind: 'invalid', message: valid.error.message }))
  }
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
function optionalCodeDir(codeOutput: string | undefined): { readonly codeDir?: string } {
  if (codeOutput === undefined) {
    return {}
  }
  return { codeDir: codeOutput }
}

/**
 * @private
 */
type BuildCodeIgnoresParams = { readonly lock: Lockfile; readonly previous: Lockfile }

/**
 * @private
 */
function buildCodeIgnores({ lock, previous }: BuildCodeIgnoresParams): readonly FileChange[] {
  const directories = uniq(
    lock.packs.flatMap((pack) => {
      if (!pack.codeOutput || !pack.groups.some((group) => group.name === 'code')) {
        return []
      }
      return [pack.codeOutput]
    })
  )
  return directories.map((directory) => {
    const content = '# Granary repository reference code\n*\n'
    const owned = previous.packs.some(
      (pack) => pack.codeOutput === directory && pack.groups.some((group) => group.name === 'code')
    )
    if (!owned) {
      return { path: join(directory, '.gitignore'), content }
    }
    return { path: join(directory, '.gitignore'), content, expected: hashContent(content) }
  })
}
