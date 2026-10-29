import { z } from 'zod'

/**
 * Classify documents independently of content groups and pack composition.
 */
export const documentKindSchema = z.enum(['context', 'standards'])

/**
 * Map exact group-relative document paths to an interpretation; unlisted files are context.
 */
export const documentKindsSchema = z
  .record(
    z.string().regex(/^(?!\/)(?![A-Za-z]:)(?!.*\\)(?!.*(?:^|\/)\.\.(?:\/|$))(?!.*[*?[\]{}!]).+$/),
    documentKindSchema
  )
  .readonly()

/**
 * Identify an explicitly supported document interpretation.
 */
export type DocumentKind = z.infer<typeof documentKindSchema>
