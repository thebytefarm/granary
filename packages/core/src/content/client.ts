import { isErr, ok } from 'massaman/control'
import type { Result } from 'massaman/control'

import type { Outcome } from '#/outcome.ts'
import { createFilesystemClient } from '#/filesystem.ts'
import type { FilesystemError, ReadFilesystemClient } from '#/filesystem.ts'

export type ContentClient = {
  readonly read: (options: { readonly path: string }) => Promise<Outcome<Buffer, FilesystemError>>
  readonly text: (options: { readonly path: string }) => Promise<Outcome<string, FilesystemError>>
}

/**
 * Bind read-only content access to checked project-relative paths.
 * @param options - Project root; reads reject traversal and unsafe symlink paths.
 * @returns Readonly byte and text readers; content is never interpreted automatically.
 */
export function createContentClient({ project }: { readonly project: string }): ContentClient {
  const filesystem: Pick<ReadFilesystemClient, 'read'> = createFilesystemClient({ root: project })
  return Object.freeze({
    read: filesystem.read,
    async text({ path }: { readonly path: string }): Promise<Result<string, FilesystemError>> {
      const bytes = await filesystem.read({ path })
      if (isErr(bytes)) {
        return bytes
      }
      return ok(bytes.value.toString('utf8'))
    },
  })
}
