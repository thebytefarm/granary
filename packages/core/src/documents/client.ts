import { resolve as absolutePath } from 'node:path'

import { isErr, ok } from 'massaman/control'
import type { Result } from 'massaman/control'

import type { InstallationError } from '#/installation/errors.ts'
import type { Outcome } from '#/outcome.ts'
import { createFilesystemClient } from '#/filesystem.ts'
import { createInstallationClient } from '#/installation/client.ts'
import { buildContentDestination } from '#/content/destination.ts'
import { collectOutcomes } from '#/results.ts'
import { mapLimited } from '#/map-limited.ts'
import { readLockfile } from '#/locks/read.ts'
import type { LockedGroup, LockedPack } from '#/locks/schema.ts'
import { findPacks } from '#/packs/discover.ts'
import { readSourceDocument } from '#/manifests/read.ts'
import { resolveWorkspaceConfig } from '#/workspace/read.ts'

export type DocumentInput = {
  readonly kind: string
  readonly pack: string
  readonly version: string
  readonly path: string
  readonly group: string
  readonly revision: string | undefined
  readonly upstreamHash: string | null
  readonly source: string
}
export type DocumentsClient = {
  readonly read: () => Promise<Outcome<readonly DocumentInput[], InstallationError>>
}

/**
 * Bind effective installed content and read-only source inspection to a workspace.
 * @param options - Workspace, optional authored local source, and optional document-kind filter.
 * @returns Documents retaining classification, provenance, and consumer customizations.
 * @example
 * const documents = await createDocumentsClient({ project: process.cwd() }).read()
 */
export function createDocumentsClient({
  project,
  source,
  kind,
}: {
  readonly project: string
  readonly source?: string | undefined
  readonly kind?: string | undefined
}): DocumentsClient {
  return Object.freeze({
    async read() {
      return readInputs({ project, source, kind })
    },
  })
}

/**
 * @private
 */
async function readInputs({
  project,
  source,
  kind,
}: {
  readonly project: string
  readonly source: string | undefined
  readonly kind: string | undefined
}): Promise<Result<readonly DocumentInput[], InstallationError>> {
  if (source !== undefined) {
    return readSourceInputs({ project, source, kind })
  }
  const lock = await readLockfile({ project, required: true })
  if (isErr(lock)) {
    return lock
  }
  const inputs = collectOutcomes(
    await mapLimited({
      concurrency: 8,
      items: lock.value.packs.flatMap((pack) =>
        pack.groups.flatMap((group) =>
          [
            ...group.files.filter(
              (file) =>
                !pack.customizations?.some(
                  (custom) =>
                    custom.group === group.name &&
                    custom.path === file.path &&
                    custom.content === null
                )
            ),
            ...(pack.customizations ?? [])
              .filter(
                (custom) =>
                  custom.group === group.name &&
                  custom.content !== null &&
                  !group.files.some((file) => file.path === custom.path)
              )
              .map((custom) => ({ path: custom.path, hash: null })),
          ]
            .filter(
              (file) =>
                kind === undefined || documentKind({ pack, group, path: file.path }) === kind
            )
            .map((file) => ({ project, pack, group, file }))
        )
      ),
      transform: readInstalledInput,
    })
  )
  if (isErr(inputs)) {
    return inputs
  }
  return ok(inputs.value)
}

/**
 * @private
 */
async function readInstalledInput({
  project,
  pack,
  group,
  file,
}: {
  readonly project: string
  readonly pack: LockedPack
  readonly group: LockedGroup
  readonly file: { readonly path: string; readonly hash: string | null }
}): Promise<Result<DocumentInput, InstallationError>> {
  const bytes = await createFilesystemClient({ root: project }).read({
    path: buildContentDestination({ pack, group, path: file.path }),
  })
  if (isErr(bytes)) {
    return bytes
  }
  return ok({
    kind: documentKind({ pack, group, path: file.path }),
    pack: pack.request.name,
    version: pack.version,
    path: file.path,
    group: group.name,
    revision: group.origin.revision,
    upstreamHash: file.hash,
    source: bytes.value.toString('utf8'),
  })
}

/**
 * @private
 */
async function readSourceInputs({
  project,
  source,
  kind,
}: {
  readonly project: string
  readonly source: string
  readonly kind: string | undefined
}): Promise<Result<readonly DocumentInput[], InstallationError>> {
  const origin = { provider: 'local' as const, path: absolutePath(project, source) }
  const available = await findPacks({ project, source: origin })
  if (isErr(available)) {
    return available
  }
  const definition = await readSourceDocument({
    opened: { source: origin, directory: origin.path },
    prefix: '.',
  })
  if (isErr(definition)) {
    return definition
  }
  const inputs = collectOutcomes(
    await mapLimited({
      items: available.value.filter((pack) => pack.kind === 'pack'),
      concurrency: 2,
      transform: async (pack): Promise<Result<readonly DocumentInput[], InstallationError>> => {
        const suffix = selectedMember({
          name: pack.name,
          rootName: definition.value.document.name,
        })
        const selection = await resolveWorkspaceConfig({
          project,
          document: {
            name: 'document-source',
            packs: { [`file:${origin.path}${suffix}`]: {} },
          },
        })
        if (isErr(selection)) {
          return selection
        }
        const request = selection.value.packs[0]
        if (!request) {
          return ok([])
        }
        const snapshot = await createInstallationClient({ project }).capture({
          output: selection.value.output,
          request,
        })
        if (isErr(snapshot)) {
          return snapshot
        }
        return ok(
          snapshot.value.groups.flatMap((group) =>
            group.files
              .filter(
                (file) =>
                  kind === undefined || (group.locked.documents?.[file.path] ?? 'context') === kind
              )
              .map((file) => ({
                kind: group.locked.documents?.[file.path] ?? 'context',
                pack: pack.name,
                version: snapshot.value.locked.version,
                path: file.path,
                group: group.locked.name,
                revision: group.locked.origin.revision,
                upstreamHash: file.hash,
                source: file.content.toString('utf8'),
              }))
          )
        )
      },
    })
  )
  if (isErr(inputs)) {
    return inputs
  }
  return ok(inputs.value.flat())
}

/**
 * @private
 */
function documentKind({
  pack,
  group,
  path,
}: {
  readonly pack: LockedPack
  readonly group: LockedGroup
  readonly path: string
}): string {
  return (
    pack.customizations?.find((custom) => custom.group === group.name && custom.path === path)
      ?.kind ??
    group.documents?.[path] ??
    'context'
  )
}

/**
 * @private
 */
function selectedMember({
  name,
  rootName,
}: {
  readonly name: string
  readonly rootName: string
}): string {
  if (name === rootName) {
    return ''
  }
  return `#${name}`
}
