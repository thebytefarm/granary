import { err, isErr, ok } from 'massaman/control'
import type { Result } from 'massaman/control'

import { standardsError } from '#/standards/errors.ts'
import type { StandardsError } from '#/standards/errors.ts'
import { collectOutcomes } from '#/results.ts'
import { parseStandards } from '#/standards/parser.ts'
import type { StandardsConfig } from '#/standards/config.ts'

type ClassifiedGroup = {
  readonly locked: { readonly documents?: Readonly<Record<string, string>> | undefined }
  readonly files: readonly { readonly path: string; readonly content: Buffer }[]
}

/**
 * Check complete classified standards and pack-wide identities without installation effects.
 * @param groups - Captured documents; ordinary context is not interpreted.
 * @returns Valid document syntax and identities, or the first standards failure.
 */
export async function validateStandardsDocuments(
  groups: readonly ClassifiedGroup[]
): Promise<Result<void, StandardsError>> {
  const parsed = await readStandards(groups)
  if (isErr(parsed)) return parsed
  return ok(undefined)
}

/**
 * Validate reviewed effective documents against the consumer's configured rule identities.
 * @param options - Effective classified content, affected pack names, and pending enforcement settings.
 * @returns Success only when affected configured identities survive the review.
 */
export async function validateStandardsUpdate({
  packs,
  names,
  settings,
}: {
  readonly packs: readonly { readonly name: string; readonly groups: readonly ClassifiedGroup[] }[]
  readonly names: readonly string[]
  readonly settings: StandardsConfig | undefined
}): Promise<Result<void, StandardsError>> {
  const parsed = collectOutcomes(
    await Promise.all(
      packs.map(async (pack) => {
        const standards = await readStandards(pack.groups)
        if (isErr(standards)) return standards
        return ok(
          standards.value.flatMap((standard) =>
            standard.rules.map((rule) => `${pack.name}#${standard.id}/${rule.id}`)
          )
        )
      })
    )
  )
  if (isErr(parsed)) return parsed
  const identities = parsed.value.flat()
  const unknown = Object.keys(settings?.rules ?? {}).filter(
    (id) => names.some((name) => id.startsWith(`${name}#`)) && !identities.includes(id)
  )
  if (unknown.length > 0) {
    return err(
      standardsError({
        kind: 'invalid',
        message: `Update removes configured rule identities: ${unknown.join(', ')}. Adjust mappings and generate a new review.`,
      })
    )
  }
  return ok(undefined)
}

/**
 * @private
 */
async function readStandards(groups: readonly ClassifiedGroup[]) {
  const parsed = collectOutcomes(
    await Promise.all(
      groups.flatMap((group) =>
        group.files
          .filter((file) => group.locked.documents?.[file.path] === 'standards')
          .map((file) => parseStandards({ source: file.content.toString('utf8'), path: file.path }))
      )
    )
  )
  if (isErr(parsed)) return parsed
  const standards = parsed.value.flat()
  const identities = standards.map((standard) => standard.id)
  if (identities.some((id, index) => identities.indexOf(id) !== index)) {
    return err(
      standardsError({
        kind: 'invalid',
        message: 'Standard IDs must be unique across documents in a pack.',
      })
    )
  }
  return ok(standards)
}
