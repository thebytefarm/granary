import { err, isErr, ok } from 'massaman/control'
import type { Result } from 'massaman/control'
import { createConfigurationClient, createDocumentsClient } from '@granary/core'
import type { DocumentInput } from '@granary/core'

import { standardsConfigSchema } from '#/standards/config.ts'
import type { StandardsConfig } from '#/standards/config.ts'
import { standardsError } from '#/standards/errors.ts'
import type { StandardsError } from '#/standards/errors.ts'

export type { DocumentInput } from '@granary/core'

/**
 * Read classified standards through the engine's read-only content capabilities.
 * @param options - Project and optional local source selection.
 * @returns Uncached documents and plugin-validated enforcement settings.
 */
export function createStandardsReader({
  project,
  source,
}: {
  readonly project: string
  readonly source?: string | undefined
}): {
  readonly read: () => Promise<
    Result<
      { readonly settings: StandardsConfig; readonly inputs: readonly DocumentInput[] },
      StandardsError
    >
  >
} {
  return Object.freeze({
    async read() {
      const configuration = await createConfigurationClient({ project }).readPlugin({
        name: 'standards',
      })
      if (isErr(configuration)) return configuration
      const settings = standardsConfigSchema.safeParse(configuration.value)
      if (!settings.success)
        return err(standardsError({ kind: 'invalid', message: settings.error.message }))
      const documents = await createDocumentsClient({ project, source, kind: 'standards' }).read()
      if (isErr(documents)) return documents
      return ok({
        settings: settings.data,
        inputs: documents.value.filter((document) => document.kind === 'standards'),
      })
    },
  })
}
