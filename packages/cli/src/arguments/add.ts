import { z } from 'zod'

export const addPositionals = z.object({
  source: z.string().min(1).describe('Local path, Git URL, or owner/repo'),
})
export const addOptions = z.object({
  pack: z
    .preprocess(normalizeMissingArray, z.array(z.string()).optional())
    .describe('Full pack identities or unambiguous slugs'),
  content: z
    .preprocess(normalizeMissingArray, z.array(z.enum(['docs', 'code', 'examples'])).optional())
    .describe('Selected content groups'),
  ref: z.string().optional().describe('Git definition ref (default HEAD)'),
  version: z.string().optional().describe('Exact package version with an explicit mapping'),
  output: z.string().optional().describe('Persisted relative destination override'),
  codeOutput: z.string().optional().describe('Hidden repository-code destination override'),
  list: z.boolean().default(false).describe('Find packs without installing'),
})
export type AddArgs = z.infer<typeof addOptions> & z.infer<typeof addPositionals>
export const addArgsSchema = addPositionals.extend(addOptions.shape)

/**
 * Normalize maltty's absent-array sentinel before validating command arguments.
 * @private
 */
function normalizeMissingArray(value: unknown): unknown {
  if (Array.isArray(value) && value.length === 1 && value[0] === undefined) {
    return undefined
  }
  return value
}
