import { lstat, writeFile } from 'node:fs/promises'
import { basename, join } from 'node:path'

import { attemptAsync, err, isErr, ok } from 'massaman/control'
import type { Result } from 'massaman/control'
import { kebabCase } from 'massaman/string'

import { manifestSchema } from '@granary/core/schemas'

/**
 * Check that scaffolding targets an existing directory without consumer or authored state.
 * @param directory - Explicit project or pack root; symlink roots are rejected.
 * @returns A failure rather than replacing existing configuration or a lock.
 */
export async function checkScaffoldDirectory(directory: string): Promise<Result<void>> {
  const target = await attemptAsync(() => lstat(directory))
  if (isErr(target)) {
    return target
  }
  if (!target.value.isDirectory()) {
    return err(new Error('Choose an existing directory, not a file or symlink.'))
  }
  for (const name of ['granary.json', 'granary-lock.json']) {
    const existing = await attemptAsync(() => lstat(join(directory, name)))
    if (!isErr(existing)) {
      return err(
        new Error(
          `${name} already exists. Scaffolding never overwrites existing project or pack state.`
        )
      )
    }
    if (!('code' in existing.error) || existing.error.code !== 'ENOENT') {
      return existing
    }
  }
  return ok(undefined)
}

/**
 * Create a validated manifest exclusively, preserving files created during prompts.
 * @param options - Target root and untrusted manifest fields.
 * @returns Completion or a validation/filesystem failure; no other files are created.
 */
export async function writeNewManifest({
  directory,
  document,
}: {
  readonly directory: string
  readonly document: unknown
}): Promise<Result<void>> {
  const manifest = manifestSchema.safeParse(document)
  if (!manifest.success) {
    return err(manifest.error)
  }
  return attemptAsync(() =>
    writeFile(join(directory, 'granary.json'), `${JSON.stringify(manifest.data, null, 2)}\n`, {
      flag: 'wx',
    })
  )
}

/**
 * Suggest a portable identity from a directory without inspecting package metadata.
 * @param directory - Project or authored pack root.
 * @returns A valid manifest name, falling back to `project`.
 */
export function defaultDirectoryName(directory: string): string {
  const name = manifestSchema.safeParse({ name: kebabCase(basename(directory)) })
  if (name.success) {
    return name.data.name
  }
  return 'project'
}
