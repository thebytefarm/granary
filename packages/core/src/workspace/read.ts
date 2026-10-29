import { uniqBy } from 'massaman/array'
import { err, isErr, ok } from 'massaman/control'
import type { Result } from 'massaman/control'
import { isEqual } from 'massaman/predicate'

import { installationError } from '#/installation/errors.ts'
import type { InstallationError } from '#/installation/errors.ts'
import { createFilesystemClient } from '#/filesystem.ts'
import { manifestSchema } from '#/manifests/schema.ts'
import type { Manifest } from '#/manifests/schema.ts'
import type { ProjectConfig } from '#/workspace/config.ts'
import { readLockfile } from '#/locks/read.ts'
import { expandMembers } from '#/manifests/composition.ts'
import { defaultContextOutput } from '#/workspace/paths.ts'

export type ReadWorkspaceConfigParams = {
  readonly project: string
  readonly allowChanges?: boolean | undefined
}
export type ResolveWorkspaceConfigParams = ReadWorkspaceConfigParams & {
  readonly document: Manifest
}

/**
 * Load consumer intent without advancing locked source revisions.
 * @param options - Project owning granary.json.
 * @returns Locked normalized intent, initial resolution, or a manifest/lock drift failure.
 * @example
 * await readWorkspaceConfig({ project: process.cwd() })
 */
export async function readWorkspaceConfig({
  project,
  allowChanges = false,
}: ReadWorkspaceConfigParams): Promise<Result<ProjectConfig, InstallationError>> {
  const document = await createFilesystemClient({ root: project }).readJSON({
    path: 'granary.json',
    schema: manifestSchema,
  })
  if (isErr(document)) {
    return document
  }
  const lock = await readLockfile({ project, required: false })
  if (isErr(lock)) {
    return lock
  }
  if (lock.value.composition) {
    if (!allowChanges && !isEqual(document.value, lock.value.composition.document)) {
      return err(
        installationError({
          message:
            'granary.json differs from the lock. Prepare an update to review the changed selections.',
          kind: 'drift',
        })
      )
    }
    return ok({
      output:
        lock.value.composition.document.output ??
        lock.value.packs[0]?.output ??
        defaultContextOutput,
      packs: lock.value.packs.map((pack) => pack.request),
      composition: lock.value.composition,
      pending: document.value,
    })
  }
  if (lock.value.packs.length) {
    return err(
      installationError({
        message: 'The lock is missing composition provenance for its installed packs.',
        kind: 'drift',
      })
    )
  }
  return resolveWorkspaceConfig({ project, document: document.value })
}

/**
 * Resolve declared members recursively, recording definitions and collision-safe leaf requests.
 * @param options - Validated consumer document; this operation reads sources but writes nothing.
 * @returns Normalized requests and pinned composition provenance.
 * @example
 * await resolveWorkspaceConfig({ project: process.cwd(), document: { name: 'app', packs: { 'github:vercel/next.js': 'v16.0.0' } } })
 */
export async function resolveWorkspaceConfig({
  project,
  document,
}: ResolveWorkspaceConfigParams): Promise<Result<ProjectConfig, InstallationError>> {
  const parsed = manifestSchema.safeParse(document)
  if (!parsed.success) {
    return err(installationError({ kind: 'invalid', message: parsed.error.message }))
  }
  const output = document.output ?? defaultContextOutput
  const expanded = await expandMembers({
    context: {
      project,
      opened: { directory: project, source: { provider: 'local', path: '.' } },
      prefix: '.',
      document: parsed.data,
      output,
      chain: [],
    },
    members: parsed.data.packs ?? {},
  })
  if (isErr(expanded)) {
    return expanded
  }
  const requests = expanded.value.requests
  if (
    requests.some((request) =>
      requests.some((other) => request.name === other.name && !isEqual(request, other))
    )
  ) {
    return err(
      installationError({
        message: 'Composition selects incompatible definitions of the same installation.',
        kind: 'conflict',
      })
    )
  }
  const unique = uniqBy(requests, (request) => request.name)
  if (
    unique.some((request, index) =>
      unique.some(
        (other, otherIndex) => otherIndex !== index && request.destination === other.destination
      )
    )
  ) {
    return err(
      installationError({
        message: 'Different pack installations select the same output directory.',
        kind: 'conflict',
      })
    )
  }
  return ok({
    output,
    packs: unique,
    composition: {
      document: parsed.data,
      definitions: uniqBy(expanded.value.definitions, (definition) => definition.id),
    },
  })
}
