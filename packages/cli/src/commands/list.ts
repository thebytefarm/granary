import { command } from 'maltty'
import { isErr } from 'massaman/control'

import { readLockfile } from '@granary/core'

import { projectDirectory } from '../project/config.js'

/**
 * Display recorded identities, versions, selected content, and output roots.
 */
export const list = command({
  description: 'List locked context packs',
  handler: async (ctx) => {
    const result = await readLockfile({ project: projectDirectory(ctx), required: false })
    if (isErr(result)) {
      return ctx.fail(result.error.message)
    }
    ctx.log.info(
      [
        ...(result.value.presets ?? []).map(
          (preset) =>
            `${preset.request.name}@${preset.version}\tcomposite\t${preset.members.map((member) => member.name).join(' → ')}`
        ),
        ...result.value.packs.map(
          (pack) =>
            `${pack.request.name}@${pack.version}\t${pack.groups.map((group) => group.name).join(', ')}\t${pack.output}${codeDestinationLabel(pack.codeOutput)}`
        ),
      ].join('\n') || 'No context packs installed.'
    )
  },
})

/**
 * @private
 */
function codeDestinationLabel(codeOutput: string | undefined): string {
  if (codeOutput === undefined) {
    return ''
  }
  return `\tcode: ${codeOutput}`
}
