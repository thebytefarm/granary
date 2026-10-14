import { realpath } from 'node:fs/promises'
import { resolve as absolutePath } from 'node:path'

import { attemptAsync, isErr, ok } from 'massaman/control'
import type { Result } from 'massaman/control'

import { fromIo } from '../../errors.js'
import type { InstallationError } from '../../errors.js'
import type { OpenedSource, Source } from '../source.js'

/**
 * Open local material without replacing portable consumer paths with absolute paths.
 */
export async function openLocalDirectory({
  source,
  base,
}: {
  readonly source: Extract<Source, { kind: 'local' }>
  readonly base: string
}): Promise<Result<OpenedSource, InstallationError>> {
  const directory = fromIo(await attemptAsync(() => realpath(absolutePath(base, source.path))))
  if (isErr(directory)) {
    return directory
  }
  return ok({ source, directory: directory.value })
}
