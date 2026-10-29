import { attemptAsync, err, isErr, ok } from 'massaman/control'
import type { Result } from 'massaman/control'

import type { Outcome } from '#/outcome.ts'
import type { PackSnapshot } from '#/installation/client.ts'
import { installationError } from '#/installation/errors.ts'
import type { InstallationError } from '#/installation/errors.ts'

export type ValidationPack = {
  readonly name: string
  readonly groups: readonly {
    readonly locked: { readonly documents?: Readonly<Record<string, string>> | undefined }
    readonly files: readonly { readonly path: string; readonly content: Buffer }[]
  }[]
}
export type UpdateValidation = {
  readonly upstream: readonly ValidationPack[]
  readonly effective: readonly ValidationPack[]
  readonly names: readonly string[]
  readonly configuration: Readonly<Record<string, unknown>>
}
export type UpdateValidator = (update: UpdateValidation) => Promise<Outcome<void, Error>>

/**
 * Validate reviewed content before transaction preparation through registered plugin policies.
 * @param options - Detached content views and pending configuration; validators cannot mutate engine buffers.
 * @returns Success only when every trusted validator accepts the update.
 */
export async function validateUpdate({
  validators,
  upstream,
  effective,
  names,
  configuration,
}: {
  readonly validators: readonly UpdateValidator[]
  readonly upstream: readonly PackSnapshot[]
  readonly effective: readonly PackSnapshot[]
  readonly names: readonly string[]
  readonly configuration: Readonly<Record<string, unknown>>
}): Promise<Result<void, InstallationError>> {
  for (const validator of validators) {
    const result = await attemptAsync(() =>
      validator({
        upstream: validationPacks(upstream),
        effective: validationPacks(effective),
        names: [...names],
        configuration: structuredClone(configuration),
      })
    )
    if (isErr(result))
      return err(
        installationError({
          kind: 'invalid',
          message: 'Plugin update validation failed.',
          cause: result.error,
        })
      )
    const outcome: unknown = result.value
    if (
      outcome === null ||
      typeof outcome !== 'object' ||
      !('ok' in outcome) ||
      typeof outcome.ok !== 'boolean'
    ) {
      return err(
        installationError({
          kind: 'invalid',
          message: 'Plugin update validation must return a typed outcome.',
        })
      )
    }
    if (!outcome.ok) {
      if (!('error' in outcome) || !(outcome.error instanceof Error)) {
        return err(
          installationError({
            kind: 'invalid',
            message: 'Plugin validation failures must contain an Error.',
          })
        )
      }
      return err(
        installationError({ kind: 'invalid', message: outcome.error.message, cause: outcome.error })
      )
    }
  }
  return ok(undefined)
}

/**
 * @private
 */
function validationPacks(snapshots: readonly PackSnapshot[]): readonly ValidationPack[] {
  return snapshots.map((snapshot) => ({
    name: snapshot.locked.request.name,
    groups: snapshot.groups.map((group) => ({
      locked: { documents: { ...group.locked.documents } },
      files: group.files.map((file) => ({ path: file.path, content: Buffer.from(file.content) })),
    })),
  }))
}
