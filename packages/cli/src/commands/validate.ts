import { command } from 'maltty'
import { config } from 'maltty/config'

import { manifestSchema } from '@granary/core/schemas'

/**
 * Validate the current manifest with maltty's configuration middleware.
 */
export const validate = command({
  description: 'Validate the pack manifest in the current directory',
  middleware: [config({ name: 'granary', schema: manifestSchema })],
  handler: async (ctx) => {
    await ctx.config.load({ exitOnError: true })
    ctx.log.info('Pack manifest is valid.')
  },
})
