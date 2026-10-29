import { command } from 'maltty'
import { isErr } from 'massaman/control'

import { granary } from '@granary/sdk'

import { projectDirectory } from '#/arguments.ts'

/**
 * Restore selected context from recorded commits and verified local snapshots.
 */
export const install = command({
  description: 'Restore locked context packs',
  handler: async (ctx) => {
    const client = granary({ project: projectDirectory(ctx) })
    const result = await client.packs.install()
    if (isErr(result)) {
      return ctx.fail(result.error.message)
    }
    ctx.log.info(`Restored ${result.value.packs.length} locked pack(s).`)
  },
})
