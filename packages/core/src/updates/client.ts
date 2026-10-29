import { err, isErr } from 'massaman/control'

import { createWorkspaceClient } from '#/workspace/client.ts'
import type { WorkspaceOptions } from '#/workspace/client.ts'
import { prepareUpdate, applyUpdate, updateReviewSchema } from '#/updates/review.ts'
import { installationError } from '#/installation/errors.ts'
import type { InstallationError } from '#/installation/errors.ts'
import type { Lockfile } from '#/locks/schema.ts'
import type { Outcome } from '#/outcome.ts'
import type { UpdateReview } from '#/updates/review.ts'
import type { UpdateValidator } from '#/plugins/validation.ts'

export type UpdatesClient = {
  readonly prepare: () => Promise<Outcome<UpdateReview, InstallationError>>
  readonly apply: (options: {
    readonly review: unknown
  }) => Promise<Outcome<Lockfile, InstallationError>>
}

/**
 * Bind reviewed update preparation and application to the same project safety checks.
 * @param options - Project root and optional prevalidated intent.
 * @returns Readonly update operations; preparing and comparing never apply changes.
 */
export function createUpdatesClient({
  project,
  validators = [],
}: WorkspaceOptions & { readonly validators?: readonly UpdateValidator[] }): UpdatesClient {
  const workspace = createWorkspaceClient({ project })
  return Object.freeze({
    async prepare(): ReturnType<typeof prepareUpdate> {
      const intent = await workspace.readConfig({ allowChanges: true })
      if (isErr(intent)) {
        return intent
      }
      return prepareUpdate({ project, config: intent.value })
    },
    async apply({ review }: { readonly review: unknown }): ReturnType<typeof applyUpdate> {
      const parsed = updateReviewSchema.safeParse(review)
      if (!parsed.success) {
        return err(installationError({ kind: 'invalid', message: parsed.error.message }))
      }
      const intent = await workspace.readConfig({ allowChanges: true })
      if (isErr(intent)) {
        return intent
      }
      return applyUpdate({ project, config: intent.value, review: parsed.data, validators })
    },
  })
}
