import { command } from 'maltty'
import { config } from 'maltty/config'
import { isErr } from 'massaman/control'
import { z } from 'zod'

import { catalogSchema, packManifestSchema, validateCatalog } from '@granary/core'
import { projectDirectory } from '../project/config.js'

/**
 * Validate pack metadata using maltty's config discovery and schema validation.
 */
export const validate = command({
  description: 'Validate the pack manifest in the current directory',
  middleware: [config({ name: 'granary', schema: z.union([catalogSchema, packManifestSchema]) })],
  handler: async (ctx) => {
    const loaded = await ctx.config.load({ exitOnError: true })
    const parsed = catalogSchema.safeParse(loaded.config)
    if (parsed.success) {
      const valid = await validateCatalog({ project: projectDirectory(ctx), document: parsed.data })
      if (isErr(valid)) {
        return ctx.fail(valid.error.message)
      }
    }
    ctx.log.info('Pack manifest is valid.')
  },
})
