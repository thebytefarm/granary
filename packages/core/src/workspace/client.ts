import { err, isErr, ok } from 'massaman/control'
import type { Result } from 'massaman/control'

import type { InstallationError } from '#/installation/errors.ts'
import { installationError } from '#/installation/errors.ts'
import { createFilesystemClient } from '#/filesystem.ts'
import { readWorkspaceConfig } from '#/workspace/read.ts'
import type { ProjectConfig } from '#/workspace/config.ts'
import { checkProjectConsistency } from '#/workspace/consistency.ts'
import { defaultContextOutput } from '#/workspace/paths.ts'

export type WorkspaceOptions = { readonly project: string }
export type ReadConfigOptions = {
  readonly required?: boolean | undefined
  readonly allowChanges?: boolean | undefined
}
export type WorkspaceClient = {
  readonly readConfig: (
    options?: ReadConfigOptions
  ) => Promise<Result<ProjectConfig, InstallationError>>
  readonly checkConsistency: typeof checkProjectConsistency
}

/**
 * Bind current consumer intent and consistency checks to one workspace.
 * @param options - Consumer directory; only granary.json is read.
 * @returns Uncached reads and pure consistency checks, without format detection or migrations.
 */
export function createWorkspaceClient({ project }: WorkspaceOptions): WorkspaceClient {
  const filesystem = createFilesystemClient({ root: project })
  return Object.freeze({
    async readConfig({ required = true, allowChanges }: ReadConfigOptions = {}) {
      const present = await filesystem.exists({ path: 'granary.json' })
      if (isErr(present)) {
        return present
      }
      if (present.value) {
        return readWorkspaceConfig({ project, allowChanges })
      }
      if (required) {
        return err(
          installationError({ kind: 'invalid', message: 'Missing granary.json. Add a pack first.' })
        )
      }
      return ok({
        output: defaultContextOutput,
        packs: [],
        composition: { document: { name: 'project' }, definitions: [] },
      })
    },
    checkConsistency: checkProjectConsistency,
  })
}
