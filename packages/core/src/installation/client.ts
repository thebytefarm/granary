import { isErr, ok } from 'massaman/control'
import type { Result } from 'massaman/control'

import type { InstallationError } from '#/installation/errors.ts'
import { planAgentContext } from '#/installation/agent-context.ts'
import { collectOutcomes } from '#/results.ts'
import { buildAddPlan, buildRestorePlan, buildReviewedPlan } from '#/installation/plan.ts'
import type { InstallationPlan, ReviewedInstallationOptions } from '#/installation/plan.ts'
import { createSnapshotsClient } from '#/installation/snapshots.ts'
import { createTransactionClient } from '#/installation/transaction.ts'
import type { Lockfile } from '#/locks/schema.ts'
import { mapLimited } from '#/map-limited.ts'
import { checkComposition } from '#/manifests/composition.ts'
import type { PackRequest, ProjectConfig } from '#/workspace/config.ts'

export type { PackSnapshot } from '#/installation/snapshots.ts'

export type PrepareInstallationOptions =
  | {
      readonly kind: 'add'
      readonly config: ProjectConfig
      readonly previous: Lockfile
      readonly requests: readonly PackRequest[]
    }
  | { readonly kind: 'restore'; readonly lock: Lockfile }
  | ReviewedInstallationOptions

export type PreparedInstallation = {
  readonly lock: Lockfile
  readonly apply: () => Promise<Result<void, InstallationError>>
}
export type InstallationClient = {
  readonly capture: ReturnType<typeof createSnapshotsClient>['capture']
  readonly restore: ReturnType<typeof createSnapshotsClient>['restore']
  readonly materialize: ReturnType<typeof createSnapshotsClient>['materialize']
  readonly prepare: (
    options: PrepareInstallationOptions
  ) => Promise<Result<PreparedInstallation, InstallationError>>
  readonly apply: (
    installation: PreparedInstallation
  ) => Promise<Result<Lockfile, InstallationError>>
}

/**
 * Own source snapshots, installation planning, and transactional writes for a workspace.
 * @param options - Consumer root; preparation reads but never writes.
 * @returns Prepared installations whose application rechecks every destination before writing it.
 */
export function createInstallationClient({
  project,
}: {
  readonly project: string
}): InstallationClient {
  const snapshots = createSnapshotsClient({ project })
  const transactions = createTransactionClient({ project })

  /**
   * @private
   */
  async function preparePlan(
    options: PrepareInstallationOptions
  ): Promise<Result<InstallationPlan, InstallationError>> {
    if (options.kind === 'reviewed') {
      return buildReviewedPlan(options)
    }
    if (options.kind === 'restore') {
      if (options.lock.composition) {
        const definitions = await checkComposition({
          project,
          resolution: options.lock.composition,
        })
        if (isErr(definitions)) {
          return definitions
        }
      }
      const captured = collectOutcomes(
        await mapLimited({
          items: options.lock.packs,
          concurrency: 2,
          transform: snapshots.restore,
        })
      )
      if (isErr(captured)) {
        return captured
      }
      const effective = collectOutcomes(
        await Promise.all(captured.value.map(snapshots.materialize))
      )
      if (isErr(effective)) {
        return effective
      }
      return buildRestorePlan({ lock: options.lock, snapshots: effective.value })
    }
    const captured = collectOutcomes(
      await mapLimited({
        items: options.requests,
        concurrency: 2,
        transform: (request) =>
          snapshots.capture({
            request,
            output: options.config.output,
            codeOutput: options.config.codeOutput,
          }),
      })
    )
    if (isErr(captured)) {
      return captured
    }
    return buildAddPlan({
      config: options.config,
      previous: options.previous,
      snapshots: captured.value,
    })
  }

  return Object.freeze({
    capture: snapshots.capture,
    restore: snapshots.restore,
    materialize: snapshots.materialize,
    async prepare(
      options: PrepareInstallationOptions
    ): Promise<Result<PreparedInstallation, InstallationError>> {
      const plan = await preparePlan(options)
      if (isErr(plan)) {
        return plan
      }
      const context = await planAgentContext({ project, plan: plan.value })
      if (isErr(context)) {
        return context
      }
      const transaction = await transactions.prepare({
        ...plan.value,
        changes: [...plan.value.changes, ...context.value],
      })
      if (isErr(transaction)) {
        return transaction
      }
      return ok(Object.freeze({ lock: plan.value.lock, apply: transaction.value.apply }))
    },
    async apply(installation: PreparedInstallation): Promise<Result<Lockfile, InstallationError>> {
      const applied = await installation.apply()
      if (isErr(applied)) {
        return applied
      }
      return ok(installation.lock)
    },
  })
}
