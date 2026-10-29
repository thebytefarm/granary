import { z } from 'zod'

/**
 * Keep enforcement readable while requiring named blocking checks.
 */
export const enforcementMarkerSchema = z
  .string()
  .regex(/^\[(?:review|lint: [a-zA-Z0-9][a-zA-Z0-9_./: -]*)\]$/)

/**
 * Configure consumer checks without modifying upstream rule text or requirement levels.
 */
export const standardsConfigSchema = z
  .strictObject({
    default: z.literal('[review]').default('[review]'),
    rules: z
      .record(
        z.string().min(1),
        z
          .strictObject({
            markers: z.array(enforcementMarkerSchema).min(1).readonly(),
            notes: z.string().trim().min(1).optional(),
          })
          .readonly()
      )
      .default({}),
  })
  .readonly()
  .default({ default: '[review]', rules: {} })

/**
 * Describe validated consumer enforcement mappings keyed by qualified rule identity.
 */
export type StandardsConfig = z.infer<typeof standardsConfigSchema>
