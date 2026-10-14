import { dirname, join, posix, relative, resolve as absolutePath, sep } from 'node:path'

import { err, isErr, ok } from 'massaman/control'
import type { Result } from 'massaman/control'

import { installationError } from '../errors.js'
import type { InstallationError } from '../errors.js'
import { chooseContentGroups } from '../packs/content.js'
import type { SelectedContent } from '../packs/content.js'
import { buildDefinition } from '../packs/definition.js'
import type { ContentGroup } from '../packs/definition.js'
import { repositoryDefinitionBytes } from '../packs/catalog.js'
import { findVersionMapping } from '../packs/version.js'
import type { PackRequest } from '../project/config.js'
import { readManifest } from '../sources/manifests.js'
import { createSourceReader } from '../sources/reader.js'
import type { OpenedSource, Source, SourceRevision } from '../sources/source.js'
import { hashContent } from './integrity.js'
import { collectOutcomes } from './outcomes.js'

export type ContentRequest = {
  readonly name: ContentGroup
  readonly source: Source
  readonly root: string
  readonly entry: string
  readonly patterns: readonly string[]
}
export type PackContent = {
  readonly request: PackRequest
  readonly definition: SourceRevision
  readonly definitionHash: string
  readonly definitionHashKind?: 'catalog-v1' | 'selection-v1'
  readonly definitionVersion: string
  readonly version: string
  readonly output: string
  readonly codeOutput?: string
  readonly groups: readonly ContentRequest[]
}

/**
 * Build concrete upstream content requests without downloading payloads or assigning file destinations.
 */
export async function getPackContent({
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
  return createSourceReader().read({
    source: request.source,
    base: project,
    use: async (opened) => {
      if (request.selection) {
        return buildRepositoryContent({ opened, request, output, codeOutput })
      }
      const content = await readContentRequest({ opened, request, project, output })
      if (isErr(content)) {
        return content
      }
      const destination = request.codeOutput ?? codeOutput
      if (destination === undefined) {
        return content
      }
      return ok({ ...content.value, codeOutput: destination })
    },
  })
}

/**
 * @private
 */
type BuildRepositoryContentParams = {
  readonly opened: OpenedSource
  readonly request: PackRequest
  readonly output: string
  readonly codeOutput: string | undefined
}

/**
 * @private
 */
function buildRepositoryContent({
  opened,
  request,
  output,
  codeOutput,
}: BuildRepositoryContentParams): Result<PackContent, InstallationError> {
  const groups = request.content.flatMap((name): readonly ContentRequest[] => {
    const selected = request.selection?.[name]
    if (!selected) {
      return []
    }
    if (opened.source.kind === 'git') {
      return [
        {
          name,
          source: { ...opened.source, ref: opened.revision ?? opened.source.ref },
          root: selected.path,
          entry: posix.normalize(selected.entry),
          patterns: selected.files,
        },
      ]
    }
    return [
      {
        name,
        source: opened.source,
        root: selected.path,
        entry: posix.normalize(selected.entry),
        patterns: selected.files,
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
    definitionHash: hashContent(
      repositoryDefinitionBytes({ name: request.name, selection: request.selection })
    ),
    definitionHashKind: 'selection-v1',
    definitionVersion: '0.0.0',
    version: request.version ?? opened.revision ?? '0.0.0',
    output: request.output ?? output,
    codeOutput: request.codeOutput ?? codeOutput ?? '.context/repos',
    groups,
  })
}

/**
 * @private
 */
async function readContentRequest({
  opened,
  request,
  project,
  output,
}: {
  readonly opened: OpenedSource
  readonly request: PackRequest
  readonly project: string
  readonly output: string
}): Promise<Result<PackContent, InstallationError>> {
  const manifest = await readManifest({
    root: opened.directory,
    path: request.manifest,
    name: request.name,
  })
  if (isErr(manifest)) {
    return manifest
  }
  if (manifest.value.metadata.name !== request.name) {
    return err(
      installationError({
        kind: 'invalid',
        message: `Manifest identity does not match ${request.name}.`,
      })
    )
  }
  const definition = buildDefinition(manifest.value.metadata)
  const mapping = findVersionMapping({ definition, version: request.version })
  if (isErr(mapping)) {
    return mapping
  }
  const selected = chooseContentGroups({ definition, names: request.content })
  if (isErr(selected)) {
    return selected
  }
  const groups = collectOutcomes(
    selected.value.map((group) =>
      buildContentRequest({
        group,
        opened,
        project,
        base: dirname(manifest.value.path),
        mappedRef: mapping.value[group.name],
        hasPackageMapping:
          request.version !== undefined && Object.keys(definition.versions).length > 0,
      })
    )
  )
  if (isErr(groups)) {
    return groups
  }
  return ok({
    request,
    definition: { source: request.source, revision: opened.revision },
    definitionHash: hashContent(manifest.value.bytes),
    ...hashStrategy(manifest.value.hashKind),
    definitionVersion: definition.version,
    version: request.version ?? opened.revision ?? definition.version,
    output: request.output ?? output,
    groups: groups.value,
  })
}

/**
 * @private
 */
function hashStrategy(kind: 'catalog-v1' | undefined): {
  readonly definitionHashKind?: 'catalog-v1'
} {
  if (kind === undefined) {
    return {}
  }
  return { definitionHashKind: kind }
}

/**
 * @private
 */
function buildContentRequest({
  group,
  opened,
  project,
  base,
  mappedRef,
  hasPackageMapping,
}: {
  readonly group: SelectedContent
  readonly opened: OpenedSource
  readonly project: string
  readonly base: string
  readonly mappedRef: string | undefined
  readonly hasPackageMapping: boolean
}): Result<ContentRequest, InstallationError> {
  const origin = buildContentSource({ group, opened, project, base, mappedRef, hasPackageMapping })
  if (isErr(origin)) {
    return origin
  }
  return ok({
    name: group.name,
    source: origin.value.source,
    root: join(origin.value.prefix, group.root).split(sep).join('/'),
    entry: posix.normalize(group.entry),
    patterns: group.files,
  })
}

/**
 * @private
 */
function buildContentSource({
  group,
  opened,
  project,
  base,
  mappedRef,
  hasPackageMapping,
}: {
  readonly group: SelectedContent
  readonly opened: OpenedSource
  readonly project: string
  readonly base: string
  readonly mappedRef: string | undefined
  readonly hasPackageMapping: boolean
}): Result<{ readonly source: Source; readonly prefix: string }, InstallationError> {
  if (group.source.kind === 'git') {
    if (hasPackageMapping && !mappedRef) {
      return err(
        installationError({
          kind: 'invalid',
          message: `Package version mapping omits ${group.name}.`,
        })
      )
    }
    return ok({ source: { ...group.source, ref: mappedRef ?? group.source.ref }, prefix: '.' })
  }
  if (opened.source.kind === 'git') {
    if (group.source.path !== '.') {
      return err(
        installationError({
          kind: 'invalid',
          message: 'Git-backed definitions must use local path "." and a relative group root.',
        })
      )
    }
    return ok({
      source: { ...opened.source, ref: opened.revision ?? opened.source.ref },
      prefix: relative(opened.directory, base) || '.',
    })
  }
  return ok({
    source: {
      kind: 'local',
      path:
        relative(
          project,
          absolutePath(
            project,
            opened.source.path,
            relative(opened.directory, base),
            group.source.path
          )
        )
          .split(sep)
          .join('/') || '.',
    },
    prefix: '.',
  })
}
