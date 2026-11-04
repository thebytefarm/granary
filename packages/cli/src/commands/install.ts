import { command } from 'maltty'
import { isErr } from 'massaman/control'

import { granary } from '@granary/sdk'

import { projectDirectory } from '#/arguments.ts'
import { adoptionOptions, adoptSource } from '#/commands/adopt.ts'

/**
 * Restore selected context from recorded commits and verified local snapshots.
 */
export const install = command({
  description: 'Restore locked context, or add a source (alias of add)',
  positionals: {
    source: {
      type: 'string',
      description: 'Optional source to add; omit to restore declared/locked context',
    },
  },
  options: adoptionOptions,
  handler: async (ctx) => {
    if (ctx.args.source !== undefined) {
      return adoptSource(ctx)
    }
    if (
      [ctx.args.branch, ctx.args.tag, ctx.args.commit, ctx.args.output].some(
        (value) => value !== undefined
      ) ||
      ctx.args.list
    ) {
      return ctx.fail('Source options require a source. Use granary install to restore the lock.')
    }
    const client = granary({ project: projectDirectory(ctx) })
    const result = await client.packs.install()
    if (isErr(result)) {
      return ctx.fail(result.error.message)
    }
    ctx.log.info(`Restored ${result.value.packs.length} locked pack(s).`)
  },
})
