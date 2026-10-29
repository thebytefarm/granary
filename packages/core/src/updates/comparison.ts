import { join } from 'node:path'
import { isUtf8 } from 'node:buffer'

import { err, isErr, ok } from 'massaman/control'
import type { Result } from 'massaman/control'

import { installationError } from '#/installation/errors.ts'
import type { InstallationError } from '#/installation/errors.ts'
import { createFilesystemClient } from '#/filesystem.ts'
import { buildContentDestination } from '#/content/destination.ts'
import { hashContent } from '#/content/hash.ts'
import { collectOutcomes } from '#/results.ts'
import { createInstallationClient } from '#/installation/client.ts'
import type { PackSnapshot } from '#/installation/client.ts'
import type { LockedPack } from '#/locks/schema.ts'
import { baselineCacheDirectory } from '#/workspace/paths.ts'

type ComparisonFile = { readonly path: string; readonly bytes: Buffer }
type ChangeKind = 'unchanged' | 'upstream' | 'local' | 'identical' | 'conflict'
export type FileComparison = {
  readonly path: string
  readonly kind: ChangeKind
  readonly encoding: 'utf8' | 'base64'
  readonly baseline: string | null
  readonly local: string | null
  readonly incoming: string | null
}

/**
 * @private
 */
export async function readBaseline({
  project,
  pack,
}: {
  readonly project: string
  readonly pack: LockedPack
}): Promise<Result<readonly ComparisonFile[], InstallationError>> {
  const cached = collectOutcomes(
    await Promise.all(
      pack.groups.flatMap((group) =>
        group.files.map(async (file) => {
          const bytes = await readOptionalFile({
            project,
            path: join(baselineCacheDirectory, file.hash),
          })
          if (isErr(bytes)) {
            return bytes
          }
          if (bytes.value !== null && hashContent(bytes.value) !== file.hash) {
            return err(
              installationError({
                kind: 'drift',
                message: `Baseline integrity mismatch: ${file.hash}`,
              })
            )
          }
          if (bytes.value === null) {
            const installed = await readOptionalFile({
              project,
              path: buildContentDestination({ pack, group, path: file.path }),
            })
            if (isErr(installed)) {
              return installed
            }
            if (installed.value !== null && hashContent(installed.value) === file.hash) {
              return ok({ path: `${group.name}/${file.path}`, bytes: installed.value })
            }
          }
          return ok({ path: `${group.name}/${file.path}`, bytes: bytes.value })
        })
      )
    )
  )
  if (isErr(cached)) {
    return cached
  }
  if (cached.value.every((file) => file.bytes !== null)) {
    return ok(
      cached.value.flatMap((file) => {
        if (file.bytes === null) {
          return []
        }
        return [{ path: file.path, bytes: file.bytes }]
      })
    )
  }
  const snapshot = await createInstallationClient({ project }).restore(pack)
  if (isErr(snapshot)) {
    return err(
      installationError({
        kind: 'drift',
        message: `Cannot recover the accepted baseline for ${pack.request.name}. ${snapshot.error.message}`,
        cause: snapshot.error,
      })
    )
  }
  return ok(snapshotFiles(snapshot.value))
}

/**
 * @private
 */
export async function readLocalFiles({
  project,
  pack,
}: {
  readonly project: string
  readonly pack: LockedPack
}): Promise<Result<readonly ComparisonFile[], InstallationError>> {
  const groups = collectOutcomes(
    await Promise.all(
      pack.groups.map(
        async (group): Promise<Result<readonly ComparisonFile[], InstallationError>> => {
          const filesystem = createFilesystemClient({ root: project })
          const path = buildContentDestination({ pack, group, path: '.' })
          const present = await filesystem.exists({ path })
          if (isErr(present)) {
            return present
          }
          if (!present.value) {
            return ok([])
          }
          const scoped = await filesystem.scope({ path })
          if (isErr(scoped)) return scoped
          const paths = await scoped.value.find({ patterns: ['**/*'] })
          if (isErr(paths)) {
            return paths
          }
          return collectOutcomes(
            await Promise.all(
              paths.value.map(async (path) => {
                const bytes = await scoped.value.read({ path })
                if (isErr(bytes)) {
                  return bytes
                }
                return ok({ path: `${group.name}/${path}`, bytes: bytes.value })
              })
            )
          )
        }
      )
    )
  )
  if (isErr(groups)) {
    return groups
  }
  return ok(groups.value.flat())
}

/**
 * @private
 */
async function readOptionalFile({
  project,
  path,
}: {
  readonly project: string
  readonly path: string
}): Promise<Result<Buffer | null, InstallationError>> {
  const filesystem = createFilesystemClient({ root: project })
  const present = await filesystem.exists({ path })
  if (isErr(present)) {
    return present
  }
  if (!present.value) {
    return ok(null)
  }
  return filesystem.read({ path })
}

/**
 * @private
 */
export function snapshotFiles(snapshot: PackSnapshot): readonly ComparisonFile[] {
  return snapshot.groups.flatMap((group) =>
    group.files.map((file) => ({ path: `${group.locked.name}/${file.path}`, bytes: file.content }))
  )
}

/**
 * @private
 */
export function compareFiles({
  baseline,
  local,
  incoming,
}: {
  readonly baseline: readonly ComparisonFile[]
  readonly local: readonly ComparisonFile[]
  readonly incoming: readonly ComparisonFile[]
}): readonly FileComparison[] {
  const paths = [...baseline, ...local, ...incoming].map((file) => file.path)
  return paths
    .filter((path, index) => paths.indexOf(path) === index)
    .toSorted()
    .map((path) => {
      const before = baseline.find((file) => file.path === path)?.bytes ?? null
      const current = local.find((file) => file.path === path)?.bytes ?? null
      const candidate = incoming.find((file) => file.path === path)?.bytes ?? null
      const encoding = comparisonEncoding([before, current, candidate])
      return {
        path,
        kind: classifyChange({ before, current, candidate }),
        encoding,
        baseline: before?.toString(encoding) ?? null,
        local: current?.toString(encoding) ?? null,
        incoming: candidate?.toString(encoding) ?? null,
      }
    })
}

/**
 * @private
 */
function comparisonEncoding(values: readonly (Buffer | null)[]): 'utf8' | 'base64' {
  if (values.some((value) => value !== null && !isUtf8(value))) {
    return 'base64'
  }
  return 'utf8'
}

/**
 * @private
 */
function classifyChange({
  before,
  current,
  candidate,
}: {
  readonly before: Buffer | null
  readonly current: Buffer | null
  readonly candidate: Buffer | null
}): ChangeKind {
  const localChanged = !equalBytes({ left: before, right: current })
  const upstreamChanged = !equalBytes({ left: before, right: candidate })
  if (!localChanged && !upstreamChanged) {
    return 'unchanged'
  }
  if (!localChanged) {
    return 'upstream'
  }
  if (!upstreamChanged) {
    return 'local'
  }
  if (equalBytes({ left: current, right: candidate })) {
    return 'identical'
  }
  return 'conflict'
}

/**
 * @private
 */
function equalBytes({
  left,
  right,
}: {
  readonly left: Buffer | null
  readonly right: Buffer | null
}): boolean {
  if (left === null || right === null) {
    return left === right
  }
  return left.equals(right)
}
