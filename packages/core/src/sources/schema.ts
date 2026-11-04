import { z } from 'zod'

import {
  builtinSourceSchema,
  localSourceSchema,
  gitSourceSchema,
  revisionSelectorSchema,
} from '#/sources/source.ts'

const pack = z
  .string()
  .regex(/^[a-z0-9]+(?:[/-][a-z0-9]+)*$/)
  .optional()
const segment = z.string().regex(/^(?!\.{1,2}$)[\w.-]+$/)

/**
 * Validate structured SDK source intent using the transport's source and revision contracts.
 */
export const sourceSchema = z.discriminatedUnion('provider', [
  builtinSourceSchema.extend({ pack }).readonly(),
  localSourceSchema
    .extend({ path: localSourceSchema.shape.path.refine(isPortableLocator), pack })
    .readonly(),
  z
    .strictObject({
      provider: z.literal('github'),
      owner: segment,
      repo: segment,
      pack,
      revision: revisionSelectorSchema.optional(),
    })
    .readonly(),
  gitSourceSchema
    .extend({ repository: gitSourceSchema.shape.repository.refine(isPortableLocator), pack })
    .readonly(),
])

/**
 * @private
 */
function isPortableLocator(value: string): boolean {
  return [...value].every((character) => {
    const code = character.charCodeAt(0)
    return code >= 0x20 && code !== 0x7f && character !== '#'
  })
}
