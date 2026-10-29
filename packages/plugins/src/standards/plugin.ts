import { definePlugin } from '@granary/core'
import { createStandardsClient } from '#/standards/client.ts'
import type { StandardsOptions } from '#/standards/client.ts'
import { err, isErr, ok } from 'massaman/control'
import { standardsConfigSchema } from '#/standards/config.ts'
import { standardsError } from '#/standards/errors.ts'
import { validateStandardsDocuments, validateStandardsUpdate } from '#/standards/validation.ts'

/**
 * Compose standards interpretation under its literal namespace.
 * @example
 * const registration = standardsPlugin({ source: './packs/engineering' })
 */
export const standardsPlugin = definePlugin((options: StandardsOptions = {}) => ({
  name: 'standards',
  setup({ project }) {
    return createStandardsClient({ project, ...options })
  },
  async validateUpdate({ upstream, effective, names, configuration }) {
    const settings = standardsConfigSchema.safeParse(configuration.standards)
    if (!settings.success)
      return err(standardsError({ kind: 'invalid', message: settings.error.message }))
    for (const pack of upstream) {
      const valid = await validateStandardsDocuments(pack.groups)
      if (isErr(valid)) return valid
    }
    const valid = await validateStandardsUpdate({
      packs: effective,
      names,
      settings: settings.data,
    })
    if (isErr(valid)) return valid
    return ok(undefined)
  },
}))
