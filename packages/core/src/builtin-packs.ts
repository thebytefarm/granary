import { realpath } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

import { attemptAsync, err, isErr, ok } from 'massaman/control'
import type { Result } from 'massaman/control'

import { sourceError } from '#/sources/errors.ts'
import type { SourceError } from '#/sources/errors.ts'
import type { OpenedSource, Source } from '#/sources/source.ts'

/**
 * Open an exact bundled snapshot while retaining its portable source identity.
 * @param source - Validated built-in collection and version; no latest fallback is supported.
 * @returns A source rooted at the shipped snapshot or an explicit unavailable-version failure.
 */
export async function openBuiltinSource(
  source: Extract<Source, { provider: 'builtin' }>
): Promise<Result<OpenedSource, SourceError>> {
  if (source.name !== 'bytefarm' || source.version !== '0.1.0') {
    return err(
      sourceError({
        kind: 'invalid',
        message: `Built-in snapshot ${source.name}@${source.version} is not bundled with this Granary release. Install a release that includes it; locked restoration never substitutes another version.`,
      })
    )
  }
  const directory = await attemptAsync(() =>
    realpath(fileURLToPath(new URL('../builtins/bytefarm/0.1.0/', import.meta.url)))
  )
  if (isErr(directory)) {
    return err(
      sourceError({
        kind: 'invalid',
        message: `Bundled snapshot ${source.name}@${source.version} is missing or unreadable: ${directory.error.message}`,
      })
    )
  }
  return ok({ source, directory: directory.value })
}
