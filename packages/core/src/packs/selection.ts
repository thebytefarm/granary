import { matchesGlob, posix, resolve } from 'node:path'

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
  readonly root: string
  readonly paths: readonly string[]
  readonly documents: Readonly<Record<string, DocumentKind>>
}

/**
 * Read an authored file selection and narrow it with consumer overrides.
 * @param options - Source-relative selection and consumer destinations to exclude from self-installs.
 * @returns The prefix-relative selection root with root-relative paths and document kinds, or a path, metadata, or empty-selection failure.
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
  const authoredRoot = selectionRoot(authored.files?.root)
  const root = selectionRoot(options.files?.root ?? authored.files?.root)
  const found = await findRootedFiles({ opened, prefix, root: authoredRoot, patterns })
  if (isErr(found)) {
    return found
  }
  if (root !== authoredRoot) {
    const checked = await findRootedFiles({ opened, prefix, root, patterns: [] })
    if (isErr(checked)) {
      return checked
    }
  }
  const sourcePaths = found.value.map((path) => posix.join(authoredRoot, path))
  const selected = sourcePaths.filter(
    (path) =>
      isWithin({ root, path }) &&
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
      installationError({ kind: 'invalid', message: emptySelectionMessage({ root, label }) })
    )
  }
  const declared = { ...authored.documents, ...options.documents }
  if (Object.keys(declared).some((path) => !sourcePaths.includes(path))) {
    return err(
      installationError({
        kind: 'invalid',
        message: `Document declarations must identify existing selected source files: ${label}.`,
      })
    )
  }
  return ok({
    root,
    paths: selected.map((path) => stripRoot({ root, path })),
    documents: Object.fromEntries(
      Object.entries(declared)
        .filter(([path]) => selected.includes(path))
        .map(([path, kind]) => [stripRoot({ root, path }), kind])
    ),
  })
}

/**
 * Report a missing local selection root as invalid input, matching Git checkouts, before scoping I/O.
 * @private
 */
async function findRootedFiles({
  opened,
  prefix,
  root,
  patterns,
}: {
  readonly opened: OpenedSource
  readonly prefix: string
  readonly root: string
  readonly patterns: readonly string[]
}): Promise<Result<readonly string[], InstallationError>> {
  const scoped = posix.join(prefix, root)
  if (root === '.' || opened.checkout) {
    return findSourceFiles({ opened, prefix: scoped, patterns })
  }
  const present = await createFilesystemClient({ root: opened.directory }).exists({ path: scoped })
  if (isErr(present)) {
    return present
  }
  if (!present.value) {
    return err(installationError({ kind: 'invalid', message: `Content root is missing: ${root}.` }))
  }
  return findSourceFiles({ opened, prefix: scoped, patterns })
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
 * Evaluate each selection's globs relative to its own root, so source-relative paths compare consistently.
 * @private
 */
function matchesSelection({ path, authored, options }: MatchesSelectionParams): boolean {
  const authoredPath = stripRoot({ root: selectionRoot(authored.files?.root), path })
  const consumerRoot = selectionRoot(options.files?.root)
  const consumerPath = stripRoot({ root: consumerRoot, path })
  return (
    !(authored.files?.exclude ?? []).some((pattern) => matchesGlob(authoredPath, pattern)) &&
    (options.files === undefined ||
      (isWithin({ root: consumerRoot, path }) &&
        options.files.include.some((pattern) => matchesGlob(consumerPath, pattern)))) &&
    !(options.files?.exclude ?? []).some((pattern) => matchesGlob(consumerPath, pattern))
  )
}

/**
 * @private
 */
function selectionRoot(root: string | undefined): string {
  const normalized = posix.normalize(root ?? '.').replace(/\/+$/, '')
  return normalized || '.'
}

/**
 * @private
 */
type RootPathParams = { readonly root: string; readonly path: string }

/**
 * @private
 */
function isWithin({ root, path }: RootPathParams): boolean {
  return root === '.' || path.startsWith(`${root}/`)
}

/**
 * @private
 */
function stripRoot({ root, path }: RootPathParams): string {
  if (root === '.') {
    return path
  }
  return path.slice(root.length + 1)
}

/**
 * @private
 */
function emptySelectionMessage({
  root,
  label,
}: {
  readonly root: string
  readonly label: string
}): string {
  if (root === '.') {
    return `File selection is empty: ${label}.`
  }
  return `File selection is empty under root ${root}: ${label}.`
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
