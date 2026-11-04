import { command } from 'maltty'
import { adoptionOptions, adoptSource } from '#/commands/adopt.ts'

/**
 * Adopt selected material through the workspace SDK without a CLI-specific domain layer.
 */
export const add = command({
  description: 'Add context from a pack, local/Git source, or nextjs@16',
  positionals: {
    source: {
      type: 'string',
      required: true,
      description: 'Local path, Git URL, github:owner/repo[/pack], or nextjs@16',
    },
  },
  options: adoptionOptions,
  handler: adoptSource,
})
