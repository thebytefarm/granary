import { err, ok } from 'massaman/control'
import type { Result } from 'massaman/control'
import { match } from 'massaman/match'
import type { z } from 'zod'

import { sourceError } from '#/sources/errors.ts'
import type { SourceError } from '#/sources/errors.ts'
import type { PackOptions } from '#/manifests/schema.ts'
import { sourceSchema as inputSchema } from '#/sources/schema.ts'
import type { Source } from '#/sources/source.ts'

/** Structured SDK source intent; locator encoding is an installer detail. */
export type SourceInput = Readonly<z.infer<typeof inputSchema>>
export type ResolvedSourceInput = {
  readonly locator: string
  readonly source: Source
  readonly options: PackOptions
}

/**
 * Validate structured source intent before encoding a manifest key.
 * @param input - Local, GitHub, or generic Git source with at most one revision selector.
 * @returns Validated locator and source, without accessing the network.
 */
export function resolveSourceInput(input: SourceInput): Result<ResolvedSourceInput, SourceError> {
  const parsed = inputSchema.safeParse(input)
  if (!parsed.success) {
    return err(sourceError({ kind: 'invalid', message: parsed.error.message }))
  }
  const value = parsed.data
  const suffix = packSuffix(value.pack)
  const locator = match(value)
    .with({ provider: 'local' }, (source) => `file:${source.path}${suffix}`)
    .with({ provider: 'github' }, (source) => {
      if (source.pack) {
        return `github:${source.owner}/${source.repo}/${source.pack}`
      }
      return `github:${source.owner}/${source.repo}`
    })
    .with({ provider: 'git' }, (source) => `git+${source.repository}${suffix}`)
    .exhaustive()
  const options = revisionOptions(value)
  const source: Source = match(value)
    .with({ provider: 'local' }, ({ provider, path }) => Object.freeze({ provider, path }))
    .with({ provider: 'git' }, ({ provider, repository, revision }) =>
      Object.freeze({ provider, repository, revision })
    )
    .with({ provider: 'github' }, ({ owner, repo, revision }) =>
      Object.freeze({
        provider: 'git' as const,
        repository: `https://github.com/${owner}/${repo}.git`,
        revision,
      })
    )
    .exhaustive()
  return ok({ locator, source, options })
}

/**
 * @private
 */
function revisionOptions(source: z.infer<typeof inputSchema>): PackOptions {
  if (source.provider === 'local') {
    return {}
  }
  return source.revision ?? {}
}

/**
 * @private
 */
function packSuffix(pack: string | undefined): string {
  if (pack) {
    return `#${pack}`
  }
  return ''
}
