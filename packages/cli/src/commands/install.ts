import { command } from 'maltty'
import { config } from 'maltty/config'
import { isErr } from 'massaman/control'

import { installPacks, projectConfigSchema } from '@granary/core'

import { loadProjectConfig, projectDirectory } from '../project/config.js'

/**
 * Restore selected context from recorded commits and verified local snapshots.
 */
export const install = command({
  description: 'Restore locked context packs',
  middleware: [config({ name: 'granary', schema: projectConfigSchema })],
  handler: async (ctx) => {
    const project = projectDirectory(ctx)
    const projectConfig = await loadProjectConfig({ ctx, project, required: true })
    const result = await installPacks({ project, config: projectConfig })
    if (isErr(result)) {
      return ctx.fail(result.error.message)
    }
    ctx.log.info(`Restored ${result.value.packs.length} locked pack(s).`)
  },
})
