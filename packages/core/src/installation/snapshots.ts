import { attemptAsync, err, isErr, ok } from 'massaman/control'
import { realpath } from 'node:fs/promises'
import { resolve as absolutePath, sep } from 'node:path'
import { matchesGlob, posix } from 'node:path'
import type { Result } from 'massaman/control'

import { fromIo, installationError } from '#/installation/errors.ts'
import type { InstallationError } from '#/installation/errors.ts'
import { createFilesystemClient } from '#/filesystem.ts'
import { mapLimited } from '#/map-limited.ts'
import type { LockedGroup, LockedPack } from '#/locks/schema.ts'
import { createSourcesClient } from '#/sources/client.ts'
import type { OpenedSource, Source, SourceRevision } from '#/sources/source.ts'
import type { DocumentKind } from '#/content/metadata.ts'
import type { ContentGroup, PackRequest } from '#/workspace/config.ts'
import { hashContent } from '#/content/hash.ts'
import { collectOutcomes } from '#/results.ts'
import { defaultContextOutput } from '#/workspace/paths.ts'

export type ContentFile = { readonly path: string; readonly content: Buffer; readonly hash: string }
export type GroupSnapshot = { readonly locked: LockedGroup; readonly files: readonly ContentFile[] }
export type PackSnapshot = {
  readonly locked: LockedPack
  readonly groups: readonly GroupSnapshot[]
}
type CaptureSnapshotOptions = {
  readonly request: PackContent['request']
  readonly output: string
  readonly codeOutput?: string | undefined
}
type SnapshotsClient = {
  readonly materialize: typeof materializeCustomizations
  readonly capture: (
    options: CaptureSnapshotOptions
  ) => Promise<Result<PackSnapshot, InstallationError>>
  readonly restore: (pack: LockedPack) => Promise<Result<PackSnapshot, InstallationError>>
}

/**
 * Bind source capture and locked integrity verification to a workspace.
 * @param options - Consumer root used to resolve source paths and reject output overlap.
 * @returns Snapshot reads that never modify consumer or upstream files.
 */
export function createSnapshotsClient({ project }: { readonly project: string }): SnapshotsClient {
  return Object.freeze({
    materialize: materializeCustomizations,
    async capture({
      request,
      output,
      codeOutput,
    }: CaptureSnapshotOptions): Promise<Result<PackSnapshot, InstallationError>> {
      const content = await getPackContent({ project, request, output, codeOutput })
      if (isErr(content)) {
        return content
      }
      return readPackSnapshot({ project, content: content.value })
    },
    restore(pack: LockedPack): Promise<Result<PackSnapshot, InstallationError>> {
      return readLockedSnapshot({ project, pack })
    },
  })
}

/**
 * Read selected upstream files and record the exact bytes and commits obtained.
 */
async function readPackSnapshot({
  content,
  project,
}: {
  readonly content: PackContent
  readonly project: string
}): Promise<Result<PackSnapshot, InstallationError>> {
  const groups = collectOutcomes(
    await mapLimited({
      items: content.groups,
      concurrency: 2,
      transform: (group) =>
        readGroupSnapshot({
          group,
          project,
          destinations: [content.output, content.codeOutput, content.request.destination].filter(
            (path) => path !== undefined
          ),
        }),
    })
  )
  if (isErr(groups)) {
    return groups
  }
  const locked: LockedPack = {
    request: content.request,
    definition: content.definition,
    definitionHash: content.definitionHash,
    definitionHashKind: content.definitionHashKind,
    definitionVersion: content.definitionVersion,
    version: content.version,
    output: content.output,
    ...snapshotCodeDestination(content.codeOutput),
    groups: groups.value.map((group) => group.locked),
  }
  return ok({ locked, groups: groups.value })
}

/**
 * Read only locked files from pinned commits and verify every recorded hash.
 */
async function readLockedSnapshot({
  pack,
  project,
}: {
  readonly pack: LockedPack
  readonly project: string
}): Promise<Result<PackSnapshot, InstallationError>> {
  const definition = checkLockedDefinition(pack)
  if (isErr(definition)) {
    return definition
  }
  const groups = collectOutcomes(
    await mapLimited({
      items: pack.groups,
      concurrency: 2,
      transform: (group) => readLockedGroup({ group, project, name: pack.request.name }),
    })
  )
  if (isErr(groups)) {
    return groups
  }
  return ok({ locked: pack, groups: groups.value })
}

/**
 * @private
 */
async function readGroupSnapshot({
  group,
  project,
  destinations,
}: {
  readonly group: ContentRequest
  readonly project: string
  readonly destinations: readonly string[]
}): Promise<Result<GroupSnapshot, InstallationError>> {
  return createSourcesClient().read({
    source: group.source,
    base: project,
    use: (opened) => captureGroup({ group, opened, project, destinations }),
  })
}

/**
 * @private
 */
async function captureGroup({
  group,
  opened,
  project,
  destinations,
}: {
  readonly group: ContentRequest
  readonly opened: OpenedSource
  readonly project: string
  readonly destinations: readonly string[]
}): Promise<Result<GroupSnapshot, InstallationError>> {
  if (opened.checkout) {
    const selected = opened.checkout.find({ root: group.root, patterns: group.patterns })
    if (isErr(selected)) return selected
    const materialized = await opened.checkout.materialize({
      paths: selected.value.map((path) => posix.join(group.root, path)),
    })
    if (isErr(materialized)) return materialized
  }
  const filesystem = await createFilesystemClient({ root: opened.directory }).scope({
    path: group.root,
  })
  if (isErr(filesystem)) {
    return filesystem
  }
  const root = absolutePath(opened.directory, group.root)
  const canonicalProject = fromIo(await attemptAsync(() => realpath(project)))
  if (isErr(canonicalProject)) {
    return canonicalProject
  }
  const outputs = destinations.map((path) => absolutePath(canonicalProject.value, path))
  if (outputs.some((output) => root === output || root.startsWith(`${output}${sep}`))) {
    return err(
      installationError({
        kind: 'conflict',
        message: 'Authored source overlaps an installation destination.',
      })
    )
  }
  const paths = await filesystem.value.find({
    patterns: group.patterns,
    includeIgnored: group.includeIgnored,
  })
  if (isErr(paths)) {
    return paths
  }
  const selected = paths.value.filter(
    (path) =>
      !(group.exclude ?? []).some((pattern) => matchesGlob(path, pattern)) &&
      !outputs.some((output) => {
        const file = absolutePath(root, path)
        return file === output || file.startsWith(`${output}${sep}`)
      })
  )
  if (!selected.includes(group.entry)) {
    return err(
      installationError({
        kind: 'invalid',
        message: `Entry ${group.entry} is missing or excluded from ${group.name}.`,
      })
    )
  }
  if (Object.keys(group.documents ?? {}).some((path) => !selected.includes(path))) {
    return err(
      installationError({
        kind: 'invalid',
        message: `Document declarations must name selected files in ${group.name}.`,
      })
    )
  }
  const files = await readContentFiles({ root, paths: selected })
  if (isErr(files)) {
    return files
  }
  return ok({ locked: buildLockedGroup({ group, opened, files: files.value }), files: files.value })
}

/**
 * @private
 */
function buildLockedGroup({
  group,
  opened,
  files,
}: {
  readonly group: ContentRequest
  readonly opened: OpenedSource
  readonly files: readonly ContentFile[]
}): LockedGroup {
  return {
    name: group.name,
    origin: { source: opened.source, revision: opened.revision },
    root: group.root,
    entry: group.entry,
    documents: group.documents,
    files: files.map(({ path, hash }) => ({ path, hash })),
  }
}

/**
 * @private
 */
async function readContentFiles({
  root,
  paths,
}: {
  readonly root: string
  readonly paths: readonly string[]
}): Promise<Result<readonly ContentFile[], InstallationError>> {
  return collectOutcomes(
    await mapLimited({
      items: paths,
      concurrency: 8,
      transform: (path) => readContentFile({ root, path }),
    })
  )
}

/**
 * @private
 */
async function readContentFile({
  root,
  path,
}: {
  readonly root: string
  readonly path: string
}): Promise<Result<ContentFile, InstallationError>> {
  const bytes = await createFilesystemClient({ root }).read({ path })
  if (isErr(bytes)) {
    return bytes
  }
  return ok({ path, content: bytes.value, hash: hashContent(bytes.value) })
}

/**
 * @private
 */
function checkLockedDefinition(pack: LockedPack): Result<void, InstallationError> {
  return checkContentHash({
    content: repositoryDefinitionBytes({
      name: pack.request.name,
      selection: pack.request.selection,
    }),
    hash: pack.definitionHash,
    name: pack.request.name,
  })
}

/**
 * @private
 */
function checkContentHash({
  content,
  hash,
  name,
}: {
  readonly content: Buffer
  readonly hash: string
  readonly name: string
}): Result<void, InstallationError> {
  if (hashContent(content) !== hash) {
    return err(
      installationError({
        kind: 'drift',
        message: `Locked source changed for ${name}; restore the original source before installing.`,
      })
    )
  }
  return ok(undefined)
}

/**
 * @private
 */
function snapshotCodeDestination(codeOutput: string | undefined): { readonly codeOutput?: string } {
  if (codeOutput === undefined) {
    return {}
  }
  return { codeOutput }
}

/**
 * @private
 */
async function readLockedGroup({
  group,
  project,
  name,
}: {
  readonly group: LockedGroup
  readonly project: string
  readonly name: string
}): Promise<Result<GroupSnapshot, InstallationError>> {
  return createSourcesClient().read({
    ...group.origin,
    base: project,
    use: async (opened) => {
      if (opened.checkout) {
        const materialized = await opened.checkout.materialize({
          paths: group.files.map((file) => posix.join(group.root, file.path)),
        })
        if (isErr(materialized)) return materialized
      }
      const filesystem = await createFilesystemClient({ root: opened.directory }).scope({
        path: group.root,
      })
      if (isErr(filesystem)) {
        return filesystem
      }
      const files = await readContentFiles({
        root: absolutePath(opened.directory, group.root),
        paths: group.files.map((file) => file.path),
      })
      if (isErr(files)) {
        return files
      }
      const checked = collectOutcomes(
        files.value.map((file) =>
          checkContentHash({
            content: file.content,
            hash: group.files.find((expected) => expected.path === file.path)?.hash ?? '',
            name,
          })
        )
      )
      if (isErr(checked)) {
        return checked
      }
      return ok({ locked: group, files: files.value })
    },
  })
}

type ContentRequest = {
  readonly name: ContentGroup
  readonly source: Source
  readonly root: string
  readonly entry: string
  readonly patterns: readonly string[]
  readonly documents?: Readonly<Record<string, DocumentKind>> | undefined
  readonly exclude?: readonly string[] | undefined
  readonly includeIgnored?: boolean | undefined
}
type PackContent = {
  readonly request: PackRequest
  readonly definition: SourceRevision
  readonly definitionHash: string
  readonly definitionHashKind: 'selection-v1'
  readonly definitionVersion: string
  readonly version: string
  readonly output: string
  readonly codeOutput?: string
  readonly groups: readonly ContentRequest[]
}

/**
 * @private
 */
async function getPackContent({
  request,
  project,
  output,
  codeOutput,
}: {
  readonly request: PackRequest
  readonly project: string
  readonly output: string
  readonly codeOutput?: string | undefined
}): Promise<Result<PackContent, InstallationError>> {
  return createSourcesClient().read({
    source: request.source,
    revision: request.revision,
    base: project,
    use: async (opened) => buildRepositoryContent({ opened, request, output, codeOutput }),
  })
}

/**
 * @private
 */
function repositoryDefinitionBytes({
  name,
  selection,
}: Pick<PackRequest, 'name' | 'selection'>): Buffer {
  return Buffer.from(JSON.stringify(canonicalValue({ name, selection })))
}

/**
 * @private
 */
function canonicalValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalValue)
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .toSorted(([left], [right]) => {
          if (left < right) return -1
          if (left > right) return 1
          return 0
        })
        .map(([key, entry]) => [key, canonicalValue(entry)])
    )
  }
  return value
}

/**
 * @private
 */
function buildRepositoryContent({
  opened,
  request,
  output,
  codeOutput,
}: {
  readonly opened: OpenedSource
  readonly request: PackRequest
  readonly output: string
  readonly codeOutput: string | undefined
}): Result<PackContent, InstallationError> {
  const groups = request.content.flatMap((name): readonly ContentRequest[] => {
    const selected = request.selection[name]
    if (!selected) return []
    const source = opened.source
    return [
      {
        name,
        source: pinSource(source, opened.revision),
        root: selected.path,
        entry: posix.normalize(selected.entry),
        patterns: selected.files,
        exclude: selected.exclude,
        documents: selected.documents,
        includeIgnored: true,
      },
    ]
  })
  if (groups.length !== request.content.length) {
    return err(
      installationError({
        kind: 'invalid',
        message: 'Repository selection must supply every requested content group.',
      })
    )
  }
  return ok({
    request,
    definition: { source: request.source, revision: opened.revision },
    definitionHash: hashContent(repositoryDefinitionBytes(request)),
    definitionHashKind: 'selection-v1',
    definitionVersion: '0.0.0',
    version: request.version ?? opened.revision ?? '0.0.0',
    output: request.output ?? output,
    codeOutput: request.codeOutput ?? codeOutput ?? `${defaultContextOutput}/repos`,
    groups,
  })
}

/**
 * @private
 */
function pinSource(source: Source, commit: string | undefined): Source {
  if (source.provider !== 'git' || !commit) return source
  return { ...source, revision: { commit } }
}

/**
 * @private
 */
async function materializeCustomizations(
  snapshot: PackSnapshot
): Promise<Result<PackSnapshot, InstallationError>> {
  const customizations = snapshot.locked.customizations ?? []
  if (
    customizations.some(
      (file) =>
        file.content !== null &&
        (Buffer.from(file.content, 'base64').toString('base64') !== file.content ||
          hashContent(Buffer.from(file.content, 'base64')) !== file.hash)
    )
  ) {
    return err(
      installationError({
        kind: 'drift',
        message: `Invalid accepted customization content: ${snapshot.locked.request.name}`,
      })
    )
  }
  const groups = snapshot.groups.map((group) => {
    const overrides = customizations.filter((file) => file.group === group.locked.name)
    const files = [
      ...group.files.filter((file) => !overrides.some((override) => override.path === file.path)),
      ...overrides.flatMap((file) => {
        if (file.content === null || file.hash === null) return []
        return [{ path: file.path, content: Buffer.from(file.content, 'base64'), hash: file.hash }]
      }),
    ].toSorted((left, right) => left.path.localeCompare(right.path))
    const documents = Object.fromEntries([
      ...Object.entries(group.locked.documents ?? {}).filter(([path]) =>
        files.some((file) => file.path === path)
      ),
      ...overrides.flatMap((file) => {
        if (file.content === null || file.kind === undefined) return []
        return [[file.path, file.kind] as const]
      }),
    ])
    return { locked: { ...group.locked, documents }, files }
  })
  if (groups.some((group) => !group.files.some((file) => file.path === group.locked.entry))) {
    return err(
      installationError({
        kind: 'invalid',
        message: 'Accepted customizations must retain each group entrypoint.',
      })
    )
  }
  return ok({ locked: snapshot.locked, groups })
}
