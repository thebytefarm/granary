import { isErr } from 'massaman/control'
import type { Result } from 'massaman/control'
import { match } from 'massaman/match'

import type { SourceError } from '#/sources/errors.ts'
import { createGitClient } from '#/sources/git/client.ts'
import { createLocalClient } from '#/sources/local/client.ts'
import type { OpenedSource, Source } from '#/sources/source.ts'
import { openBuiltinSource } from '#/builtin-packs.ts'

export type SourceReadParams<CONTENT> = {
  readonly source: Source
  readonly base: string
  readonly revision?: string | undefined
  readonly use: (opened: OpenedSource) => Promise<Result<CONTENT, SourceError>>
}
export type SourcesClient = { readonly read: typeof readSource }

/**
 * Create transport adapters without leaking temporary checkout paths to callers.
 */
export function createSourcesClient(): SourcesClient {
  return Object.freeze({ read: readSource })
}

/**
 * @private
 */
async function readSource<CONTENT>({
  source,
  base,
  revision,
  use,
}: SourceReadParams<CONTENT>): Promise<Result<CONTENT, SourceError>> {
  return match(source)
    .with({ provider: 'builtin' }, async (builtin) => {
      const opened = await openBuiltinSource(builtin)
      if (isErr(opened)) {
        return opened
      }
      return use(opened.value)
    })
    .with({ provider: 'local' }, async (local) => {
      const opened = await createLocalClient().open({ source: local, base })
      if (isErr(opened)) {
        return opened
      }
      return use(opened.value)
    })
    .with({ provider: 'git' }, (git) =>
      createGitClient().withCheckout({ source: git, revision, use })
    )
    .exhaustive()
}
