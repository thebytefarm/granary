import { isErr } from 'massaman/control'
import type { Outcome } from '@granary/core'

import type { StandardsError } from '#/standards/errors.ts'
import { createConfigurationClient } from '@granary/core'
import { standardsConfigSchema } from '#/standards/config.ts'
import { err } from 'massaman/control'
import { standardsError } from '#/standards/errors.ts'

/**
 * Persist the review-only default while preserving configured per-rule enforcement mappings.
 * @param options - Existing consumer project with a structured granary.json.
 * @returns Success after an atomic config write, or a validation/filesystem failure.
 * @example
 * await setupStandards({ project: process.cwd() })
 */
export async function setupStandards({
  project,
}: {
  readonly project: string
}): Promise<Outcome<void, StandardsError>> {
  const configuration = createConfigurationClient({ project })
  const config = await configuration.readPlugin({ name: 'standards' })
  if (isErr(config)) {
    return config
  }
  const settings = standardsConfigSchema.safeParse(config.value)
  if (!settings.success)
    return err(standardsError({ kind: 'invalid', message: settings.error.message }))
  return configuration.configurePlugin({ name: 'standards', value: settings.data })
}
