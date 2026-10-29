import { matchesGlob, resolve } from 'node:path'

import { err, isErr, ok } from 'massaman/control'
import type { Result } from 'massaman/control'

import { installationError } from '#/installation/errors.ts'
import type { InstallationError } from '#/installation/errors.ts'
import { createFilesystemClient } from '#/filesystem.ts'
import type { DocumentKind } from '#/content/metadata.ts'
import type { PackOptions } from '#/manifests/schema.ts'
import type { OpenedSource } from '#/sources/source.ts'

export type ReadPackFilesParams = {
  readonly opened: OpenedSource
  readonly prefix: string
  readonly project: string
  readonly output: string
  readonly destination?: string | undefined
  readonly authored: PackOptions
  readonly options: PackOptions
  readonly label: string
}
export type SelectedPackFiles = {
  readonly paths: readonly string[]
  readonly documents: Readonly<Record<string, DocumentKind>>
}

/**
 * Read an authored file selection and narrow it with consumer overrides.
 * @param options - Source-relative selection and consumer destinations to exclude from self-installs.
 * @returns Selected paths and document kinds, or a path, metadata, or empty-selection failure.
 */
export async function readPackFiles({
  opened,
  prefix,
  project,
  output,
  destination,
  authored,
  options,
  label,
}: ReadPackFilesParams): Promise<Result<SelectedPackFiles, InstallationError>> {
  const patterns = defaultFiles(authored)
  const found = await findSourceFiles({ opened, prefix, patterns })
  if (isErr(found)) {
    return found
  }
  const selected = found.value.filter(
    (path) =>
      matchesSelection({ path, authored, options }) &&
      !isConsumerFile({
        project,
        outputs: [output, destination].filter((value) => value !== undefined),
        root: resolve(opened.directory, prefix),
        path,
      })
  )
  if (
    !selected.length &&
    patterns.length &&
    options.files?.include.length !== 0 &&
    !authored.packs &&
    !options.packs
  ) {
    return err(
      installationError({ kind: 'invalid', message: `File selection is empty: ${label}.` })
    )
  }
  const declared = { ...authored.documents, ...options.documents }
  if (Object.keys(declared).some((path) => !found.value.includes(path))) {
    return err(
      installationError({
        kind: 'invalid',
        message: `Document declarations must identify existing selected source files: ${label}.`,
      })
    )
  }
  return ok({
    paths: selected,
    documents: Object.fromEntries(
      Object.entries(declared).filter(([path]) => selected.includes(path))
    ),
  })
}

/**
 * @private
 */
async function findSourceFiles({
  opened,
  prefix,
  patterns,
}: {
  readonly opened: OpenedSource
  readonly prefix: string
  readonly patterns: readonly string[]
}): Promise<Result<readonly string[], InstallationError>> {
  if (opened.checkout) return opened.checkout.find({ root: prefix, patterns })
  const source = await createFilesystemClient({ root: opened.directory }).scope({ path: prefix })
  if (isErr(source)) return source
  return source.value.find({ patterns, includeIgnored: true })
}

/**
 * @private
 */
type MatchesSelectionParams = {
  readonly path: string
  readonly authored: PackOptions
  readonly options: PackOptions
}

/**
 * @private
 */
function matchesSelection({ path, authored, options }: MatchesSelectionParams): boolean {
  return (
    !(authored.files?.exclude ?? []).some((pattern) => matchesGlob(path, pattern)) &&
    (options.files === undefined ||
      options.files.include.some((pattern) => matchesGlob(path, pattern))) &&
    !(options.files?.exclude ?? []).some((pattern) => matchesGlob(path, pattern))
  )
}

/**
 * @private
 */
function defaultFiles(pack: PackOptions): readonly string[] {
  if (pack.files) {
    return pack.files.include
  }
  if (pack.packs) {
    return []
  }
  return ['**/*']
}

/**
 * @private
 */
type IsConsumerFileParams = {
  readonly project: string
  readonly outputs: readonly string[]
  readonly root: string
  readonly path: string
}

/**
 * @private
 */
function isConsumerFile({ project, outputs, root, path }: IsConsumerFileParams): boolean {
  const file = resolve(root, path)
  return (
    ['.granary', ...outputs].some((output) => {
      const destination = resolve(project, output)
      return file === destination || file.startsWith(`${destination}/`)
    }) || path.split('/').includes('.git')
  )
}
