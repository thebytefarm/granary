import { posix } from 'node:path'

import { isErr, ok } from 'massaman/control'
import type { Result } from 'massaman/control'

import type { InstallationError } from '#/installation/errors.ts'
import { createFilesystemClient } from '#/filesystem.ts'
import { hashContent } from '#/content/hash.ts'
import { manifestSchema } from '#/manifests/schema.ts'
import type { Manifest } from '#/manifests/schema.ts'
import type { OpenedSource } from '#/sources/source.ts'

export type ReadSourceDocumentParams = {
  readonly opened: OpenedSource
  readonly prefix: string
}
export type SourceDocument = {
  readonly document: Manifest
  readonly hash: string | null
}

/**
 * Read an authored source definition, distinguishing absence from invalid metadata.
 * @param options - Open source and repository-relative content root.
 * @returns An authored manifest or an unconfigured repository; invalid files remain failures.
 */
export async function readSourceDocument({
  opened,
  prefix,
}: ReadSourceDocumentParams): Promise<Result<SourceDocument, InstallationError>> {
  const filesystem = createFilesystemClient({ root: opened.directory })
  const path = posix.join(prefix, 'granary.json')
  if (opened.checkout) {
    const materialized = await opened.checkout.materialize({ paths: [path] })
    if (isErr(materialized)) return materialized
  }
  const present = await filesystem.exists({ path })
  if (isErr(present)) {
    return present
  }
  if (!present.value) {
    return ok({ document: { name: 'repository' }, hash: null })
  }
  const document = await filesystem.readJSON({
    path,
    schema: manifestSchema,
  })
  if (isErr(document)) {
    return document
  }
  return ok({
    document: document.value,
    hash: hashContent(Buffer.from(JSON.stringify(document.value))),
  })
}
