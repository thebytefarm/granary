import { err, ok } from 'massaman/control'
import type { Result } from 'massaman/control'
import { flow } from 'massaman/function'

import { sourceError } from '#/sources/errors.ts'
import type { SourceError } from '#/sources/errors.ts'
import { sourceSchema } from '#/sources/source.ts'
import type { Source } from '#/sources/source.ts'
import type { PackOptions } from '#/manifests/schema.ts'
import { packOptionsSchema } from '#/manifests/schema.ts'

export type PackLocator = { readonly source: Source; readonly pack: string | undefined }
export type ParsePackLocatorParams = {
  readonly locator: string
  readonly options?: PackOptions | undefined
}

/**
 * Distinguish source keys from named inline pack definitions.
 */
export function isPackLocator(key: string): boolean {
  return /^(?:github:|git\+|file:|\.\.?\/)/.test(key)
}

/**
 * Parse a source and optional named pack without conflating pack names with paths.
 * @param options - Portable locator and explicit revision intent.
 * @returns A validated source or an invalid-locator failure.
 */
export function parsePackLocator({
  locator,
  options = {},
}: ParsePackLocatorParams): Result<PackLocator, SourceError> {
  const valid = packOptionsSchema.safeParse(options)
  if (!valid.success) {
    return invalid(valid.error.message)
  }
  if (locator.startsWith('github:')) {
    const [owner, repository, ...pack] = locator.slice(7).split('/')
    if (
      !owner ||
      !repository ||
      owner === '.' ||
      owner === '..' ||
      repository === '.' ||
      repository === '..' ||
      !/^[\w.-]+$/.test(owner) ||
      !/^[\w.-]+$/.test(repository) ||
      pack.some((part) => !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(part))
    ) {
      return invalid(`Invalid GitHub pack locator: ${locator}.`)
    }
    return gitLocator({
      repository: `https://github.com/${owner}/${repository}.git`,
      pack: pack.join('/') || undefined,
      options,
    })
  }
  if (locator.startsWith('git+')) {
    const [repository, pack, extra] = locator.slice(4).split('#')
    if (
      !repository ||
      extra !== undefined ||
      (pack !== undefined && !/^[a-z0-9]+(?:[/-][a-z0-9]+)*$/.test(pack))
    ) {
      return invalid(`Expected git+<repository>[#pack-name]: ${locator}.`)
    }
    return gitLocator({ repository, pack, options })
  }
  if (locator.startsWith('file:') || locator.startsWith('./') || locator.startsWith('../')) {
    if (options.branch || options.tag || options.commit) {
      return invalid('Local sources do not accept branch, tag, or commit selectors.')
    }
    const path = locator.replace(/^file:/, '')
    const [directory, pack, extra] = path.split('#')
    if (
      !directory ||
      extra !== undefined ||
      (pack !== undefined && !/^[a-z0-9]+(?:[/-][a-z0-9]+)*$/.test(pack))
    ) {
      return invalid(`Invalid local source: ${locator}.`)
    }
    const source = sourceSchema.safeParse({ provider: 'local', path: directory })
    if (!source.success) {
      return invalid(source.error.message)
    }
    return ok({ source: source.data, pack })
  }
  return invalid(`Unsupported pack locator: ${locator}.`)
}

/**
 * Build a readable source namespace using portable filename characters.
 * @param locator - Source locator or named pack; GitHub's prefix becomes a directory.
 * @returns A relative path with unsafe characters escaped within each segment.
 */
export function packDirectory(locator: string): string {
  return flow(
    (value: string) => value.replace(/^(github|file):/, '$1/').replace(/^git\+/, 'git/'),
    (value) => value.split('/'),
    (parts) => parts.map(packDirectorySegment),
    (parts) => parts.join('/')
  )(locator)
}

/**
 * Preserve ordinary filenames and escape unsafe characters without URL encoding.
 * @param value - One source or revision segment, including any literal ref slashes.
 * @returns A nonempty segment using only letters, digits, dots, underscores, and hyphens.
 * @private
 */
export function packDirectorySegment(value: string): string {
  if (value.length === 0) {
    return '_x_'
  }
  const escaped = value.replace(
    /_x|[^A-Za-z0-9._-]/gu,
    (part) => `_x${Buffer.from(part).toString('hex')}_`
  )
  if (escaped.startsWith('.') || escaped.startsWith('-')) {
    return `_x${Buffer.from(escaped.slice(0, 1)).toString('hex')}_${escaped.slice(1)}`
  }
  return escaped
}

/**
 * @private
 */
type GitLocatorParams = {
  readonly repository: string
  readonly pack: string | undefined
  readonly options: PackOptions
}

/**
 * @private
 */
function gitLocator({
  repository,
  pack,
  options,
}: GitLocatorParams): Result<PackLocator, SourceError> {
  const source = sourceSchema.safeParse({
    provider: 'git',
    repository,
    revision: revisionSelector(options),
  })
  if (!source.success) {
    return invalid(source.error.message)
  }
  return ok({ source: source.data, pack })
}

/**
 * @private
 */
function revisionSelector(options: PackOptions) {
  if (options.tag) {
    return { tag: options.tag }
  }
  if (options.branch) {
    return { branch: options.branch }
  }
  if (options.commit) return { commit: options.commit }
  return undefined
}

/**
 * @private
 */
function invalid(message: string): Result<never, SourceError> {
  return err(sourceError({ kind: 'invalid', message }))
}
