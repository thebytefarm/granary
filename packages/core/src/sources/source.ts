import { z } from 'zod'
import type { Result } from 'massaman/control'

import type { SourceError } from '#/sources/errors.ts'

export const relativePathSchema = z
  .string()
  .min(1)
  .refine((path) => !hasUnprintableCharacters(path), 'Paths must not contain control characters')
  .regex(/^(?!\/)(?![A-Za-z]:)(?!.*\\)(?!.*(?:^|\/)\.\.(?:\/|$)).+$/, 'Expected a relative path')
export const refSchema = z
  .string()
  .min(1)
  .refine(isGitRef, 'Expected a Git ref without control or option characters')

export const commitHashSchema = z.string().regex(/^[a-f0-9]{40}(?:[a-f0-9]{24})?$/)
export const revisionSelectorSchema = z.union([
  z
    .strictObject({ branch: refSchema, tag: z.never().optional(), commit: z.never().optional() })
    .readonly(),
  z
    .strictObject({ tag: refSchema, branch: z.never().optional(), commit: z.never().optional() })
    .readonly(),
  z
    .strictObject({
      commit: commitHashSchema,
      branch: z.never().optional(),
      tag: z.never().optional(),
    })
    .readonly(),
])

export const localSourceSchema = z.strictObject({
  provider: z.literal('local'),
  path: z
    .string()
    .min(1)
    .refine((path) => !hasUnprintableCharacters(path), 'Paths must not contain control characters'),
})
export const gitSourceSchema = z.strictObject({
  provider: z.literal('git'),
  repository: z
    .string()
    .regex(/^(?:https:\/\/|ssh:\/\/|git@|file:\/\/)\S+$/, 'Expected HTTPS, SSH, Git, or file URL')
    .refine(
      (repository) => !hasUnprintableCharacters(repository),
      'Repository URLs must not contain control characters'
    ),
  revision: revisionSelectorSchema.optional(),
})

/**
 * Retain structured source intent, including shorthand revisions authored in manifests.
 */
export const sourceSchema = z.discriminatedUnion('provider', [
  localSourceSchema.readonly(),
  gitSourceSchema
    .extend({ revision: z.union([revisionSelectorSchema, refSchema]).optional() })
    .readonly(),
])
export type Source = z.infer<typeof sourceSchema>

/**
 * Resolve structured or shorthand Git revision intent only at the transport boundary.
 * @param source - Generic Git source after optional provider-specific locator normalization.
 * @returns An explicit ref, exact commit, or HEAD for the remote default branch.
 */
export function sourceReference(source: Extract<Source, { provider: 'git' }>): string {
  const revision = source.revision
  if (typeof revision === 'string') return revision
  if (revision?.branch) return `refs/heads/${revision.branch}`
  if (revision?.tag) return `refs/tags/${revision.tag}`
  return revision?.commit ?? 'HEAD'
}

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
export type OpenedSource = SourceRevision & {
  readonly directory: string
  readonly checkout?: {
    readonly find: (options: {
      readonly root: string
      readonly patterns: readonly string[]
    }) => Result<readonly string[], SourceError>
    readonly materialize: (options: {
      readonly paths: readonly string[]
    }) => Promise<Result<void, SourceError>>
  }
}

/**
 * @private
 */
function hasSourceRevision(value: {
  readonly source: Source
  readonly revision?: string | undefined
}): boolean {
  if (value.source.provider === 'local') {
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
