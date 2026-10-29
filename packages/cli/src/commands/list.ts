import { command } from 'maltty'
import { isErr } from 'massaman/control'

import { granary } from '@granary/sdk'
import type { LockedPack } from '@granary/core'

import { projectDirectory } from '#/arguments.ts'

/**
 * Display recorded identities, versions, selected content, and output roots.
 */
export const list = command({
  description: 'List locked context packs',
  handler: async (ctx) => {
    const client = granary({ project: projectDirectory(ctx) })
    const result = await client.locks.read({ required: false })
    if (isErr(result)) {
      return ctx.fail(result.error.message)
    }
    ctx.log.info(result.value.packs.map(packLabel).join('\n') || 'No context packs installed.')
  },
})

/**
 * @private
 */
function packLabel(pack: LockedPack): string {
  const label = pack.request.label ?? pack.request.name
  if (pack.request.destination) {
    return `${label}@${pack.version}\tfiles\t${pack.request.destination}`
  }
  return `${label}@${pack.version}\t${pack.groups.map((group) => group.name).join(', ')}\t${pack.output}${codeDestinationLabel(pack.codeOutput)}`
}

/**
 * @private
 */
function codeDestinationLabel(codeOutput: string | undefined): string {
  if (codeOutput === undefined) {
    return ''
  }
  return `\tcode: ${codeOutput}`
}
