import type { CommandContext } from 'maltty'
import { isErr } from 'massaman/control'
import { z } from 'zod'

import { granary } from '@granary/sdk'

import { projectDirectory, sourceArgumentsSchema } from '#/arguments.ts'
import { createAdoptionResolver } from '#/catalog/nextjs.ts'

export const adoptionOptions = {
  branch: { type: 'string', description: 'Explicit Git branch' },
  tag: { type: 'string', description: 'Explicit Git tag' },
  commit: { type: 'string', description: 'Exact Git commit' },
  output: { type: 'string', description: 'Relative destination override' },
  list: { type: 'boolean', default: false, description: 'Find packs without installing' },
} as const

/**
 * Adopt a source through the same resolver and SDK for both command spellings.
 * @param ctx - Parsed command context; failures use the terminal boundary.
 * @returns Completion after discovery or transactional installation.
 */
export async function adoptSource(ctx: CommandContext): Promise<void> {
  const args = sourceArgumentsSchema
    .extend({ output: z.string().optional(), list: z.boolean().default(false) })
    .safeParse(ctx.args)
  if (!args.success) {
    return ctx.fail(args.error.message)
  }
  const adoption = await createAdoptionResolver()(args.data)
  if (isErr(adoption)) {
    return ctx.fail(adoption.error.message)
  }
  const { source, files, summary } = adoption.value
  const client = granary({ project: projectDirectory(ctx) })
  if (args.data.list) {
    if (summary) {
      ctx.log.info(summary)
      return
    }
    const found = await client.packs.find({ source })
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
  const result = await client.packs.add({ source, files, output: args.data.output })
  if (isErr(result)) {
    return ctx.fail(result.error.message)
  }
  if (summary) {
    ctx.log.info(summary)
  }
  ctx.log.info(`Installed context. ${result.value.packs.length} pack(s) locked.`)
}
