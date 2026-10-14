import { isErr } from 'massaman/control'
import type { Result } from 'massaman/control'
import { match } from 'massaman/match'

import type { InstallationError } from '../errors.js'
import { createGitSource } from './git/checkout.js'
import { openLocalDirectory } from './local/directory.js'
import type { OpenedSource, Source } from './source.js'

export type SourceReadParams<CONTENT> = {
  readonly source: Source
  readonly base: string
  readonly revision?: string | undefined
  readonly use: (opened: OpenedSource) => Promise<Result<CONTENT, InstallationError>>
}
export type SourceReader = { readonly read: typeof readSource }

/**
 * Create transport adapters without leaking temporary checkout paths to callers.
 */
export function createSourceReader(): SourceReader {
  return { read: readSource }
}

/**
 * @private
 */
async function readSource<CONTENT>({
  source,
  base,
  revision,
  use,
}: SourceReadParams<CONTENT>): Promise<Result<CONTENT, InstallationError>> {
  return match(source)
    .with({ kind: 'local' }, async (local) => {
      const opened = await openLocalDirectory({ source: local, base })
      if (isErr(opened)) {
        return opened
      }
      return use(opened.value)
    })
    .with({ kind: 'git' }, (git) => createGitSource().withCheckout({ source: git, revision, use }))
    .exhaustive()
}
