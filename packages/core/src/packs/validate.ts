import { posix, resolve as absolutePath } from 'node:path'

import { err, isErr, ok } from 'massaman/control'
import type { Result } from 'massaman/control'

import { installationError } from '../errors.js'
import type { InstallationError } from '../errors.js'
import { findFiles } from '../filesystem/file.js'
import { checkPath } from '../filesystem/path.js'
import { collectOutcomes } from '../installation/outcomes.js'
import { buildCatalogLeaf } from './catalog.js'
import type { Catalog } from './catalog.js'
export type ValidateCatalogParams = { readonly project: string; readonly document: Catalog }

/**
 * Verify declared local payloads without installing or fetching external sources.
 * @param options - Validated manifest and the directory owning its paths.
 * @returns Success when all local entries are selected regular files, or a path/content failure.
 * @example
 * await validateCatalog({ project: process.cwd(), document })
 */
export async function validateCatalog({
  project,
  document,
}: ValidateCatalogParams): Promise<Result<void, InstallationError>> {
  const outcomes = collectOutcomes(
    await Promise.all(
      Object.entries(document.packs ?? {}).map(async ([name, declaration]) => {
        if ('includes' in declaration) {
          return ok(undefined)
        }
        const definition = buildCatalogLeaf({ name, declaration })
        if (isErr(definition)) {
          return definition
        }
        const groups = collectOutcomes(
          await Promise.all(
            Object.values(definition.value.groups).map(async (group) => {
              if (!group || group.source.kind === 'git') {
                return ok(undefined)
              }
              const safe = await checkPath({
                root: absolutePath(project, group.source.path),
                path: group.root,
              })
              if (isErr(safe)) {
                return safe
              }
              const files = await findFiles({ root: safe.value, patterns: group.files })
              if (isErr(files)) {
                return files
              }
              if (!files.value.includes(posix.normalize(group.entry))) {
                return err(
                  installationError({
                    kind: 'invalid',
                    message: `Entry ${group.entry} is missing or excluded from ${name}.`,
                  })
                )
              }
              return ok(undefined)
            })
          )
        )
        if (isErr(groups)) {
          return groups
        }
        return ok(undefined)
      })
    )
  )
  if (isErr(outcomes)) {
    return outcomes
  }
  return ok(undefined)
}
