import { z } from 'zod'

/**
 * Validate portable pack metadata and relative content-selection paths.
 * @example
 * ```ts
 * const result = packManifestSchema.safeParse({
 *   name: 'bytefarm/core-standards',
 *   version: '0.1.0',
 *   description: 'Core engineering standards for functional TypeScript.',
 *   entry: 'README.md',
 *   files: ['README.md'],
 * })
 * ```
 */
export const packManifestSchema = z
  .strictObject({
    name: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*(?:\/[a-z0-9]+(?:-[a-z0-9]+)*)?$/),
    version: z
      .string()
      .regex(
        /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/,
        'Expected a semantic version such as 0.1.0 or 1.0.0-rc.1'
      ),
    description: z.string().trim().min(1),
    entry: z
      .string()
      .min(1)
      .regex(
        /^(?!\/)(?![A-Za-z]:)(?!.*\\)(?!.*(?:^|\/)\.\.(?:\/|$))(?!.*[*?[\]{}!]).+$/,
        'Expected a relative file path without glob patterns'
      ),
    files: z
      .array(
        z
          .string()
          .min(1)
          .regex(
            /^(?![/!])(?![A-Za-z]:)(?!.*\\)(?!.*(?:^|\/)\.\.(?:\/|$)).+$/,
            'Expected a positive, relative file path or glob'
          )
      )
      .min(1)
      .readonly(),
  })
  .readonly()

/**
 * Describe a validated pack manifest with immutable content-selection fields.
 * @example
 * ```ts
 * const manifest: PackManifest = {
 *   name: 'bytefarm/core-standards',
 *   version: '0.1.0',
 *   description: 'Core engineering standards for functional TypeScript.',
 *   entry: 'README.md',
 *   files: ['README.md'],
 * }
 * ```
 */
export type PackManifest = z.infer<typeof packManifestSchema>
