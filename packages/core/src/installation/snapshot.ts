import { attemptAsync, err, isErr, ok } from 'massaman/control'
import { realpath } from 'node:fs/promises'
import { resolve as absolutePath, sep } from 'node:path'
import type { Result } from 'massaman/control'

import { fromIo, installationError } from '../errors.js'
import type { InstallationError } from '../errors.js'
import { findFiles, readBytes } from '../filesystem/file.js'
import { checkPath } from '../filesystem/path.js'
import { mapLimited } from '../map-limited.js'
import { repositoryDefinitionBytes } from '../packs/catalog.js'
import type { LockedGroup, LockedPack } from '../project/lock.js'
import { createSourceReader } from '../sources/reader.js'
import { readManifest } from '../sources/manifests.js'
import type { OpenedSource } from '../sources/source.js'
import type { ContentRequest, PackContent } from './content.js'
import { checkContentHash, hashContent } from './integrity.js'
import { collectOutcomes } from './outcomes.js'

export type ContentFile = { readonly path: string; readonly content: Buffer; readonly hash: string }
export type GroupSnapshot = { readonly locked: LockedGroup; readonly files: readonly ContentFile[] }
export type PackSnapshot = {
  readonly locked: LockedPack
  readonly groups: readonly GroupSnapshot[]
}

/**
 * Read selected upstream files and record the exact bytes and commits obtained.
 */
export async function readPackSnapshot({
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
          destinations: [content.output, content.codeOutput].filter((path) => path !== undefined),
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
    ...snapshotHashStrategy(content.definitionHashKind),
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
export async function readLockedSnapshot({
  pack,
  project,
}: {
  readonly pack: LockedPack
  readonly project: string
}): Promise<Result<PackSnapshot, InstallationError>> {
  const definition = await checkLockedDefinition({ pack, project })
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
  return createSourceReader().read({
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
  const root = await checkPath({ root: opened.directory, path: group.root })
  if (isErr(root)) {
    return root
  }
  const canonicalProject = fromIo(await attemptAsync(() => realpath(project)))
  if (isErr(canonicalProject)) {
    return canonicalProject
  }
  const outputs = destinations.map((path) => absolutePath(canonicalProject.value, path))
  if (outputs.some((output) => root.value === output || root.value.startsWith(`${output}${sep}`))) {
    return err(
      installationError({
        kind: 'conflict',
        message: 'Authored source overlaps an installation destination.',
      })
    )
  }
  const paths = await findFiles({ root: root.value, patterns: group.patterns })
  if (isErr(paths)) {
    return paths
  }
  const selected = paths.value.filter(
    (path) =>
      !outputs.some((output) => {
        const file = absolutePath(root.value, path)
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
  const files = await readContentFiles({ root: root.value, paths: selected })
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
  const safe = await checkPath({ root, path })
  if (isErr(safe)) {
    return safe
  }
  const bytes = await readBytes(safe.value)
  if (isErr(bytes)) {
    return bytes
  }
  return ok({ path, content: bytes.value, hash: hashContent(bytes.value) })
}

/**
 * @private
 */
async function checkLockedDefinition({
  pack,
  project,
}: {
  readonly pack: LockedPack
  readonly project: string
}): Promise<Result<void, InstallationError>> {
  if (pack.definitionHashKind === 'selection-v1') {
    return checkContentHash({
      content: repositoryDefinitionBytes({
        name: pack.request.name,
        selection: pack.request.selection,
      }),
      hash: pack.definitionHash,
      name: pack.request.name,
    })
  }
  return createSourceReader().read({
    ...pack.definition,
    base: project,
    use: async (opened) => {
      if (pack.definitionHashKind === 'catalog-v1') {
        const manifest = await readManifest({
          root: opened.directory,
          path: pack.request.manifest,
          name: pack.request.name,
        })
        if (isErr(manifest)) {
          return manifest
        }
        if (manifest.value.hashKind !== 'catalog-v1') {
          return err(
            installationError({
              kind: 'drift',
              message: `Definition format changed: ${pack.request.name}.`,
            })
          )
        }
        return checkContentHash({
          content: manifest.value.bytes,
          hash: pack.definitionHash,
          name: pack.request.name,
        })
      }
      const safe = await checkPath({ root: opened.directory, path: pack.request.manifest })
      if (isErr(safe)) {
        return safe
      }
      const bytes = await readBytes(safe.value)
      if (isErr(bytes)) {
        return bytes
      }
      return checkContentHash({
        content: bytes.value,
        hash: pack.definitionHash,
        name: pack.request.name,
      })
    },
  })
}

/**
 * @private
 */
function snapshotHashStrategy(kind: 'catalog-v1' | 'selection-v1' | undefined): {
  readonly definitionHashKind?: 'catalog-v1' | 'selection-v1'
} {
  if (kind === undefined) {
    return {}
  }
  return { definitionHashKind: kind }
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
  return createSourceReader().read({
    ...group.origin,
    base: project,
    use: async (opened) => {
      const root = await checkPath({ root: opened.directory, path: group.root })
      if (isErr(root)) {
        return root
      }
      const files = await readContentFiles({
        root: root.value,
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
