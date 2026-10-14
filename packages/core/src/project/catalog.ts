import { join } from 'node:path'

import { uniqBy } from 'massaman/array'
import { err, isErr, ok } from 'massaman/control'
import type { Result } from 'massaman/control'
import { omitBy } from 'massaman/object'
import { isEqual } from 'massaman/predicate'

import { installationError } from '../errors.js'
import type { InstallationError } from '../errors.js'
import { readJson } from '../filesystem/json.js'
import { checkPath } from '../filesystem/path.js'
import { catalogSchema, parseSourceLocator } from '../packs/catalog.js'
import type { Catalog } from '../packs/catalog.js'
import { collectOutcomes } from '../installation/outcomes.js'
import { getNewSelection } from '../workflows/selection.js'
import type { NewSelection } from '../workflows/selection.js'
import { readLockfile } from './lock.js'
import type { Lockfile } from './lock.js'
import type { ProjectConfig } from './config.js'
import { packRequestSchema, presetRequestSchema } from './config.js'
export type ReadCatalogProjectParams = { readonly project: string }

/**
 * Resolve concise dependencies while retaining pinned members for locked restoration.
 * @param options - Consumer project owning a structured root manifest.
 * @returns Normalized legacy-compatible intent plus the authored document, or a resolution failure.
 * @example
 * await readCatalogProject({ project: process.cwd() })
 */
export async function readCatalogProject({
  project,
}: ReadCatalogProjectParams): Promise<Result<ProjectConfig, InstallationError>> {
  const safe = await checkPath({ root: project, path: 'granary.json' })
  if (isErr(safe)) {
    return safe
  }
  const document = await readJson({ path: join(project, 'granary.json'), schema: catalogSchema })
  if (isErr(document)) {
    return document
  }
  const lock = await readLockfile({ project, required: false })
  if (isErr(lock)) {
    return lock
  }
  const selections = collectOutcomes(
    await Promise.all(
      Object.entries(document.value.dependencies ?? {}).map(([name, dependency]) =>
        resolveDependency({ project, name, dependency, lock: lock.value })
      )
    )
  )
  if (isErr(selections)) {
    return selections
  }
  const requests = selections.value.flatMap((selection) => selection.requests)
  if (
    requests.some((request) =>
      requests.some((other) => request.name === other.name && !isEqual(request, other))
    )
  ) {
    return err(
      installationError({
        kind: 'conflict',
        message: 'Dependencies select incompatible component requests.',
      })
    )
  }
  return ok({
    output: document.value.installDir ?? '.context',
    codeOutput: document.value.codeDir ?? '.context/repos',
    packs: uniqBy(requests, (request) => request.name),
    presets: selections.value.flatMap((selection) =>
      selection.presets.map((preset) => preset.request)
    ),
    document: document.value,
  })
}

/**
 * @private
 */
type ResolveDependencyParams = {
  readonly project: string
  readonly name: string
  readonly dependency: NonNullable<Catalog['dependencies']>[string]
  readonly lock: Lockfile
}

/**
 * @private
 */
async function resolveDependency({
  project,
  name,
  dependency,
  lock,
}: ResolveDependencyParams): Promise<Result<NewSelection, InstallationError>> {
  const source = parseSourceLocator(dependency.source)
  if (isErr(source)) {
    return source
  }
  if (dependency.selection) {
    const request = packRequestSchema.safeParse(
      omitBy(
        {
          name,
          source: source.value,
          manifest: 'granary.json',
          version: dependency.version,
          content: dependency.content ?? Object.keys(dependency.selection),
          selection: dependency.selection,
          output: dependency.installDir,
          codeOutput: dependency.codeDir,
        },
        (value) => value === undefined
      )
    )
    if (!request.success) {
      return err(installationError({ kind: 'invalid', message: request.error.message }))
    }
    return ok({ requests: [request.data], presets: [] })
  }
  const preset = lock.presets?.find((entry) => entry.request.name === name)
  if (preset) {
    if (dependency.content !== undefined) {
      return err(
        installationError({
          kind: 'invalid',
          message: 'Composite content is fixed by its includes.',
        })
      )
    }
    const request = presetRequestSchema.safeParse(
      omitBy(
        {
          ...preset.request,
          source: source.value,
          version: dependency.version,
          output: dependency.installDir,
          codeOutput: dependency.codeDir,
        },
        (value) => value === undefined
      )
    )
    const members = preset.members.map((member) =>
      packRequestSchema.safeParse(
        omitBy(
          {
            ...member,
            output: dependency.installDir ?? member.output,
            codeOutput: dependency.codeDir ?? member.codeOutput,
          },
          (value) => value === undefined
        )
      )
    )
    if (!request.success || members.some((member) => !member.success)) {
      return err(
        installationError({ kind: 'invalid', message: `Invalid dependency request: ${name}.` })
      )
    }
    const requests = members.flatMap((member) => {
      if (!member.success) {
        return []
      }
      return [member.data]
    })
    return ok({ requests, presets: [{ ...preset, request: request.data, members: requests }] })
  }
  const pack = lock.packs.find((entry) => entry.request.name === name)
  if (pack) {
    const request = packRequestSchema.safeParse(
      omitBy(
        {
          ...pack.request,
          source: source.value,
          version: dependency.version,
          content: dependency.content ?? pack.request.content,
          output: dependency.installDir,
          codeOutput: dependency.codeDir,
        },
        (value) => value === undefined
      )
    )
    if (!request.success) {
      return err(installationError({ kind: 'invalid', message: request.error.message }))
    }
    return ok({ requests: [request.data], presets: [] })
  }
  return getNewSelection({
    project,
    config: { output: '.context', packs: [] },
    source: source.value,
    packs: [name],
    version: dependency.version,
    content: dependency.content,
    output: dependency.installDir,
    codeOutput: dependency.codeDir,
  })
}
