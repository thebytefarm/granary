import { isErr, ok } from 'massaman/control'
import type { Result } from 'massaman/control'

import type { InstallationError } from '../errors.js'
import { getPackContent } from '../installation/content.js'
import { collectOutcomes } from '../installation/outcomes.js'
import { buildAddPlan } from '../installation/plan.js'
import { readPackSnapshot } from '../installation/snapshot.js'
import type { PackSnapshot } from '../installation/snapshot.js'
import { applyInstallation } from '../installation/transaction.js'
import { mapLimited } from '../map-limited.js'
import type { PackRequest, ProjectConfig } from '../project/config.js'
import { checkProjectConsistency } from '../project/consistency.js'
import { readLockfile } from '../project/lock.js'
import type { Lockfile } from '../project/lock.js'
import type { Source } from '../sources/source.js'
import { getNewSelection } from './selection.js'

export type AddPacksParams = {
  readonly project: string
  readonly config: ProjectConfig
  readonly source: Source
  readonly packs?: readonly string[] | undefined
  readonly content?: readonly string[] | undefined
  readonly version?: string | undefined
  readonly output?: string | undefined
  readonly codeOutput?: string | undefined
}

/**
 * Install new consumer requests and persist their exact upstream identities.
 * @param params - Consuming project, validated intent, source locator, and selected content.
 * @returns Updated lock metadata, or a failure from selection, retrieval, or project writes.
 * @example
 * await addPacks({ project: process.cwd(), config: { output: '.context', packs: [] }, source: { kind: 'local', path: '.' }, packs: ['recommended-typescript'] })
 */
export async function addPacks(
  params: AddPacksParams
): Promise<Result<Lockfile, InstallationError>> {
  const previous = await readLockfile({ project: params.project, required: false })
  if (isErr(previous)) {
    return previous
  }
  const consistency = checkProjectConsistency({ config: params.config, lock: previous.value })
  if (isErr(consistency)) {
    return consistency
  }
  const requests = await getNewSelection(params)
  if (isErr(requests)) {
    return requests
  }
  const snapshots = await readNewSnapshots({
    requests: requests.value.requests,
    project: params.project,
    output: params.config.output,
    codeOutput: params.config.codeOutput,
  })
  if (isErr(snapshots)) {
    return snapshots
  }
  const plan = buildAddPlan({
    config: params.config,
    previous: previous.value,
    snapshots: snapshots.value,
    presets: requests.value.presets,
  })
  if (isErr(plan)) {
    return plan
  }
  const applied = await applyInstallation({ project: params.project, plan: plan.value })
  if (isErr(applied)) {
    return applied
  }
  return ok(plan.value.lock)
}

/**
 * @private
 */
async function readNewSnapshots({
  requests,
  project,
  output,
  codeOutput,
}: {
  readonly requests: readonly PackRequest[]
  readonly project: string
  readonly output: string
  readonly codeOutput?: string | undefined
}): Promise<Result<readonly PackSnapshot[], InstallationError>> {
  return collectOutcomes(
    await mapLimited({
      items: requests,
      concurrency: 2,
      transform: async (request) => {
        const content = await getPackContent({ request, project, output, codeOutput })
        if (isErr(content)) {
          return content
        }
        return readPackSnapshot({ content: content.value, project })
      },
    })
  )
}
