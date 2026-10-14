import { isErr, ok } from 'massaman/control'
import type { Result } from 'massaman/control'

import type { InstallationError } from '../errors.js'
import { collectOutcomes } from '../installation/outcomes.js'
import { buildAddPlan, buildRestorePlan } from '../installation/plan.js'
import { getPackContent } from '../installation/content.js'
import { readLockedSnapshot, readPackSnapshot } from '../installation/snapshot.js'
import { exists } from '../filesystem/file.js'
import { checkPath } from '../filesystem/path.js'
import { applyInstallation } from '../installation/transaction.js'
import { mapLimited } from '../map-limited.js'
import type { ProjectConfig } from '../project/config.js'
import { checkProjectConsistency } from '../project/consistency.js'
import { readLockfile } from '../project/lock.js'
import type { Lockfile } from '../project/lock.js'
import { checkLockedPreset, readPreset } from '../sources/presets.js'

/**
 * Restore consumer content without moving the commits or integrity recorded in its lockfile.
 * @param options - Consuming project and validated intent that must match its existing lockfile.
 * @returns Existing lock metadata, or a failure for drift, retrieval, or destination conflicts.
 * @example
 * await installPacks({ project: process.cwd(), config: { output: '.context', packs: [] } })
 */
export async function installPacks({
  project,
  config,
}: {
  readonly project: string
  readonly config: ProjectConfig
}): Promise<Result<Lockfile, InstallationError>> {
  if (config.document) {
    const safe = await checkPath({ root: project, path: 'granary-lock.json', allowMissing: true })
    if (isErr(safe)) {
      return safe
    }
    const present = await exists(safe.value)
    if (isErr(present)) {
      return present
    }
    if (!present.value) {
      return installDeclaredDependencies({ project, config })
    }
  }
  const lock = await readLockfile({ project, required: true })
  if (isErr(lock)) {
    return lock
  }
  const consistency = checkProjectConsistency({ config, lock: lock.value })
  if (isErr(consistency)) {
    return consistency
  }
  const presets = collectOutcomes(
    await mapLimited({
      items: lock.value.presets ?? [],
      concurrency: 2,
      transform: (preset) => checkLockedPreset({ project, preset }),
    })
  )
  if (isErr(presets)) {
    return presets
  }
  const snapshots = collectOutcomes(
    await mapLimited({
      items: lock.value.packs,
      concurrency: 2,
      transform: (pack) => readLockedSnapshot({ pack, project }),
    })
  )
  if (isErr(snapshots)) {
    return snapshots
  }
  const plan = buildRestorePlan({ lock: lock.value, snapshots: snapshots.value })
  if (isErr(plan)) {
    return plan
  }
  const applied = await applyInstallation({ project, plan: plan.value })
  if (isErr(applied)) {
    return applied
  }
  return lock
}

/**
 * @private
 */
type InstallDeclaredDependenciesParams = {
  readonly project: string
  readonly config: ProjectConfig
}

/**
 * @private
 */
async function installDeclaredDependencies({
  project,
  config,
}: InstallDeclaredDependenciesParams): Promise<Result<Lockfile, InstallationError>> {
  const presets = collectOutcomes(
    await Promise.all((config.presets ?? []).map((request) => readPreset({ project, request })))
  )
  if (isErr(presets)) {
    return presets
  }
  const snapshots = collectOutcomes(
    await mapLimited({
      items: config.packs,
      concurrency: 2,
      transform: async (request) => {
        const content = await getPackContent({
          project,
          request,
          output: config.output,
          codeOutput: config.codeOutput,
        })
        if (isErr(content)) {
          return content
        }
        return readPackSnapshot({ project, content: content.value })
      },
    })
  )
  if (isErr(snapshots)) {
    return snapshots
  }
  const plan = buildAddPlan({
    config: { ...config, packs: [], presets: [] },
    previous: { schemaVersion: 1, packs: [] },
    snapshots: snapshots.value,
    presets: presets.value,
  })
  if (isErr(plan)) {
    return plan
  }
  const applied = await applyInstallation({ project, plan: plan.value })
  if (isErr(applied)) {
    return applied
  }
  return ok(plan.value.lock)
}
