import { command } from 'maltty'
import { isErr } from 'massaman/control'
import { z } from 'zod'

import { granary } from '@granary/sdk'

import { parseSource, projectDirectory, sourceArgumentsSchema } from '#/arguments.ts'

/**
 * Adopt selected material through the workspace SDK without a CLI-specific domain layer.
 */
export const add = command({
  description: 'Install local or Git-backed context packs',
  positionals: {
    source: {
      type: 'string',
      required: true,
      description: 'Local path, Git URL, or github:owner/repo[/pack]',
    },
  },
  options: {
    branch: { type: 'string', description: 'Explicit Git branch' },
    tag: { type: 'string', description: 'Explicit Git tag' },
    commit: { type: 'string', description: 'Exact Git commit' },
    output: { type: 'string', description: 'Relative destination override' },
    list: { type: 'boolean', default: false, description: 'Find packs without installing' },
  },
  handler: async (ctx) => {
    const args = sourceArgumentsSchema
      .extend({ output: z.string().optional(), list: z.boolean().default(false) })
      .safeParse(ctx.args)
    if (!args.success) {
      return ctx.fail(args.error.message)
    }
    const source = parseSource(args.data)
    if (!source.success) {
      return ctx.fail(source.error.message)
    }
    const client = granary({ project: projectDirectory(ctx) })
    if (args.data.list) {
      const found = await client.packs.find({ source: source.data })
      if (isErr(found)) {
        return ctx.fail(found.error.message)
      }
      ctx.log.info(
        found.value
          .map(
            (pack) => `${pack.name}\t${pack.kind}\t${pack.content.join(', ')}\t${pack.description}`
          )
          .join('\n') || 'No packs found.'
      )
      return
    }
    const result = await client.packs.add({ source: source.data, output: args.data.output })
    if (isErr(result)) {
      return ctx.fail(result.error.message)
    }
    ctx.log.info(`Installed context. ${result.value.packs.length} pack(s) locked.`)
  },
})
