import { isErr, ok } from 'massaman/control'
import type { Result } from 'massaman/control'

import type { Outcome } from '#/outcome.ts'
import type { AvailablePack } from '#/packs/discover.ts'
import type { InstallationError } from '#/installation/errors.ts'
import type { PackOptions } from '#/manifests/schema.ts'
import { createWorkspaceClient } from '#/workspace/client.ts'
import type { WorkspaceOptions } from '#/workspace/client.ts'
import { readLockfile } from '#/locks/read.ts'
import type { Lockfile } from '#/locks/schema.ts'
import { resolveSourceInput } from '#/sources/input.ts'
import type { SourceInput } from '#/sources/input.ts'
import { findPacks } from '#/packs/discover.ts'
import { addPackSource } from '#/packs/add.ts'
import { installPacks } from '#/packs/install.ts'

export type AddSourceOptions = {
  readonly source: SourceInput
  readonly files?: PackOptions['files']
  readonly output?: string | undefined
}
export type PacksClient = {
  readonly install: () => Promise<Outcome<Lockfile, InstallationError>>
  readonly list: () => Promise<Outcome<Lockfile['packs'], InstallationError>>
  readonly add: (options: AddSourceOptions) => Promise<Outcome<Lockfile, InstallationError>>
  readonly find: (options: {
    readonly source: SourceInput
  }) => Promise<Outcome<readonly AvailablePack[], InstallationError>>
}

/**
 * Bind pack adoption and restoration to one project without caching mutable intent.
 * @param options - Project root and optional prevalidated consumer intent.
 * @returns Readonly pack operations retaining transaction and provenance checks.
 */
export function createPacksClient({ project }: WorkspaceOptions): PacksClient {
  const workspace = createWorkspaceClient({ project })
  return Object.freeze({
    async install(): Promise<Result<Lockfile, InstallationError>> {
      const intent = await workspace.readConfig()
      if (isErr(intent)) {
        return intent
      }
      return installPacks({ project, config: intent.value })
    },
    async list(): Promise<Result<Lockfile['packs'], InstallationError>> {
      const lock = await readLockfile({ project, required: false })
      if (isErr(lock)) {
        return lock
      }
      return ok(lock.value.packs)
    },
    async add({
      source,
      files,
      output,
    }: AddSourceOptions): Promise<Result<Lockfile, InstallationError>> {
      const input = resolveSourceInput(source)
      if (isErr(input)) {
        return input
      }
      const intent = await workspace.readConfig({ required: false })
      if (isErr(intent)) {
        return intent
      }
      return addPackSource({
        project,
        config: {
          ...intent.value,
          composition: intent.value.composition ?? {
            document: { name: 'project' },
            definitions: [],
          },
        },
        locator: input.value.locator,
        value: { ...input.value.options, files, output },
      })
    },
    async find({ source }: { readonly source: SourceInput }): ReturnType<typeof findPacks> {
      const input = resolveSourceInput(source)
      if (isErr(input)) {
        return input
      }
      return findPacks({ project, source: input.value.source })
    },
  })
}
