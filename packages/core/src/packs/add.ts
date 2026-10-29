import { err, isErr } from 'massaman/control'
import type { Result } from 'massaman/control'
import { uniqBy } from 'massaman/array'

import { installationError } from '#/installation/errors.ts'
import type { InstallationError } from '#/installation/errors.ts'
import { createInstallationClient } from '#/installation/client.ts'
import { manifestSchema } from '#/manifests/schema.ts'
import type { PackEntry } from '#/manifests/schema.ts'
import type { ProjectConfig } from '#/workspace/config.ts'
import { checkProjectConsistency } from '#/workspace/consistency.ts'
import { readLockfile } from '#/locks/read.ts'
import type { Lockfile } from '#/locks/schema.ts'
import { resolveWorkspaceConfig } from '#/workspace/read.ts'

export type AddPackSourceParams = {
  readonly project: string
  readonly config: ProjectConfig
  readonly locator: string
  readonly value: PackEntry
}

/**
 * Adopt a declared source without advancing any already locked installation.
 * @param options - Current consumer intent and a new source-keyed selection.
 * @returns The updated lock after transactional installation, or a no-write failure.
 * @example
 * await addPackSource({ project, config, locator: 'github:vercel/next.js', value: 'v16.0.0' })
 */
export async function addPackSource({
  project,
  config,
  locator,
  value,
}: AddPackSourceParams): Promise<Result<Lockfile, InstallationError>> {
  if (!config.composition) {
    return err(
      installationError({
        kind: 'invalid',
        message: 'Source-keyed installation requires current manifest intent.',
      })
    )
  }
  if (config.composition.document.packs?.[locator] !== undefined) {
    return err(
      installationError({
        kind: 'conflict',
        message: `Source already declared: ${locator}. Edit its array and use a reviewed update.`,
      })
    )
  }
  const previous = await readLockfile({ project, required: false })
  if (isErr(previous)) {
    return previous
  }
  const consistent = checkProjectConsistency({ config, lock: previous.value })
  if (
    isErr(consistent) &&
    (previous.value.composition !== undefined || previous.value.packs.length > 0)
  ) {
    return consistent
  }
  const document = manifestSchema.safeParse({
    ...config.composition.document,
    packs: { ...config.composition.document.packs, [locator]: value },
  })
  if (!document.success) {
    return err(installationError({ kind: 'invalid', message: document.error.message }))
  }
  const selected = await resolveWorkspaceConfig({
    project,
    document: {
      name: document.data.name,
      output: document.data.output,
      packs: { [locator]: value },
    },
  })
  if (isErr(selected)) {
    return selected
  }
  const installation = createInstallationClient({ project })
  const prepared = await installation.prepare({
    kind: 'add',
    config: {
      ...config,
      composition: {
        document: document.data,
        definitions: uniqBy(
          [...config.composition.definitions, ...(selected.value.composition?.definitions ?? [])],
          (definition) => definition.id
        ),
      },
    },
    previous: previous.value,
    requests: selected.value.packs,
  })
  if (isErr(prepared)) {
    return prepared
  }
  return installation.apply(prepared.value)
}
