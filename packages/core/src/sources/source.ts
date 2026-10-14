import { z } from 'zod'

export const relativePathSchema = z
  .string()
  .min(1)
  .refine((path) => !hasUnprintableCharacters(path), 'Paths must not contain control characters')
  .regex(/^(?!\/)(?![A-Za-z]:)(?!.*\\)(?!.*(?:^|\/)\.\.(?:\/|$)).+$/, 'Expected a relative path')
export const refSchema = z
  .string()
  .min(1)
  .refine(isGitRef, 'Expected a Git ref without control or option characters')

/**
 * Describe consumer source intent without conflating a package version with a Git ref.
 * @example
 * sourceSchema.safeParse({ kind: 'local', path: '.' })
 */
export const sourceSchema = z.discriminatedUnion('kind', [
  z
    .strictObject({
      kind: z.literal('local'),
      path: z
        .string()
        .min(1)
        .refine(
          (path) => !hasUnprintableCharacters(path),
          'Paths must not contain control characters'
        ),
    })
    .readonly(),
  z
    .strictObject({
      kind: z.literal('git'),
      repository: z
        .string()
        .regex(
          /^(?:https:\/\/|ssh:\/\/|git@|file:\/\/)\S+$/,
          'Expected HTTPS, SSH, Git, or file URL'
        )
        .refine(
          (repository) => !hasUnprintableCharacters(repository),
          'Repository URLs must not contain control characters'
        ),
      ref: refSchema.default('HEAD'),
    })
    .readonly(),
])
export type Source = z.infer<typeof sourceSchema>

export const commitHashSchema = z.string().regex(/^[a-f0-9]{40}(?:[a-f0-9]{24})?$/)

/**
 * Pin a Git source to an exact commit; local sources are pinned by file integrity.
 */
export const sourceRevisionSchema = z
  .strictObject({
    source: sourceSchema,
    revision: commitHashSchema.optional(),
  })
  .refine(hasSourceRevision, 'Git sources require a commit; local sources must not declare one')
  .readonly()
export type SourceRevision = z.infer<typeof sourceRevisionSchema>
export type OpenedSource = SourceRevision & { readonly directory: string }

/**
 * @private
 */
function hasSourceRevision(value: {
  readonly source: Source
  readonly revision?: string | undefined
}): boolean {
  if (value.source.kind === 'local') {
    return value.revision === undefined
  }
  return value.revision !== undefined
}

/**
 * Detect characters that cannot appear in portable relative paths.
 * @private
 */
function hasUnprintableCharacters(value: string): boolean {
  return [...value].some((char) => {
    const code = char.charCodeAt(0)
    return code < 0x20 || code === 0x7f
  })
}

/**
 * Enforce Git ref rules: no controls, spaces, or option-detecting prefixes or symbols.
 * @private
 */
function isGitRef(value: string): boolean {
  if (value.startsWith('-')) {
    return false
  }
  return [...value].every((char) => {
    const code = char.charCodeAt(0)
    return code > 0x20 && code !== 0x7f && !'~^:?*[\\'.includes(char)
  })
}
