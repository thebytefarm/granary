import { realpath } from 'node:fs/promises'
import { resolve as absolutePath } from 'node:path'

import { attemptAsync, isErr, ok } from 'massaman/control'
import type { Result } from 'massaman/control'

import { fromIo } from '#/sources/errors.ts'
import type { SourceError } from '#/sources/errors.ts'
import type { OpenedSource, Source } from '#/sources/source.ts'

export type LocalClient = { readonly open: typeof openLocalDirectory }

/**
 * Construct local source access without retaining mutable workspace state.
 * @returns Local material access preserving the source's portable identity.
 */
export function createLocalClient(): LocalClient {
  return Object.freeze({ open: openLocalDirectory })
}

/**
 * Open local material without replacing portable consumer paths with absolute paths.
 */
async function openLocalDirectory({
  source,
  base,
}: {
  readonly source: Extract<Source, { provider: 'local' }>
  readonly base: string
}): Promise<Result<OpenedSource, SourceError>> {
  const directory = fromIo(await attemptAsync(() => realpath(absolutePath(base, source.path))))
  if (isErr(directory)) {
    return directory
  }
  return ok({ source, directory: directory.value })
}
