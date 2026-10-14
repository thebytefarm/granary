import { uniqBy } from 'massaman/array'
import { err, isErr, ok } from 'massaman/control'
import type { Result } from 'massaman/control'
import { isEqual } from 'massaman/predicate'
import { omitBy } from 'massaman/object'

import { installationError } from '../errors.js'
import type { InstallationError } from '../errors.js'
import { collectOutcomes } from '../installation/outcomes.js'
import { mapLimited } from '../map-limited.js'
import { matchPackNames } from '../packs/identity.js'
import { packRequestSchema, presetRequestSchema } from '../project/config.js'
import type { PackRequest } from '../project/config.js'
import type { LockedPreset } from '../project/lock.js'
import { findPacks } from '../sources/manifests.js'
import type { AvailablePack } from '../sources/manifests.js'
import { readPreset } from '../sources/presets.js'
import type { AddPacksParams } from './add.js'

export type NewSelection = {
  readonly requests: readonly PackRequest[]
  readonly presets: readonly LockedPreset[]
}

/**
 * Expand selected presets and reject conflicting component intent before retrieval.
 * @param params - Validated consumer intent and catalog selection options.
 * @returns New leaf requests and pinned presets, or a selection/conflict failure.
 */
export async function getNewSelection(
  params: AddPacksParams
): Promise<Result<NewSelection, InstallationError>> {
  const available = await findPacks({ source: params.source, project: params.project })
  if (isErr(available)) {
    return available
  }
  const chosen = matchPackNames({ packs: available.value, names: params.packs })
  if (isErr(chosen)) {
    return chosen
  }
  if (
    chosen.value.some(
      (pack) =>
        params.config.packs.some((request) => request.name === pack.name) ||
        (params.config.presets ?? []).some((request) => request.name === pack.name)
    )
  ) {
    return err(
      installationError({
        kind: 'conflict',
        message: 'Pack or preset already exists in project configuration.',
      })
    )
  }
  const expanded = collectOutcomes(
    await mapLimited({
      items: chosen.value,
      concurrency: 2,
      transform: (pack) => expandSelection({ pack, params }),
    })
  )
  if (isErr(expanded)) {
    return expanded
  }
  const requests = expanded.value.flatMap((entry) => entry.requests)
  const combined = [...params.config.packs, ...requests]
  if (
    combined.some((request) =>
      combined.some((other) => other.name === request.name && !isEqual(other, request))
    )
  ) {
    return err(
      installationError({
        kind: 'conflict',
        message:
          'Selected presets request incompatible versions, sources, content, or destinations for a component.',
      })
    )
  }
  const presets = expanded.value.flatMap((entry) => entry.presets)
  const presetNames = presets.map((preset) => preset.request.name)
  if (requests.some((request) => presetNames.includes(request.name))) {
    return err(
      installationError({
        kind: 'invalid',
        message: 'A preset identity cannot also identify a component.',
      })
    )
  }
  return ok({
    requests: uniqBy(requests, (request) => request.name).filter(
      (request) => !params.config.packs.some((existing) => existing.name === request.name)
    ),
    presets,
  })
}

/**
 * @private
 */
type ExpandSelectionParams = {
  readonly pack: AvailablePack
  readonly params: AddPacksParams
}

/**
 * @private
 */
async function expandSelection({
  pack,
  params,
}: ExpandSelectionParams): Promise<Result<NewSelection, InstallationError>> {
  const request = {
    name: pack.name,
    source: params.source,
    manifest: pack.manifest,
    version: params.version,
    output: params.output,
    codeOutput: params.codeOutput,
  }
  if (pack.kind === 'preset') {
    if (params.content !== undefined) {
      return err(
        installationError({
          kind: 'invalid',
          message:
            'Preset content is fixed by its members; select a component to override --content.',
        })
      )
    }
    const parsed = presetRequestSchema.safeParse(omitBy(request, (value) => value === undefined))
    if (!parsed.success) {
      return err(installationError({ kind: 'invalid', message: parsed.error.message }))
    }
    const preset = await readPreset({ project: params.project, request: parsed.data })
    if (isErr(preset)) {
      return preset
    }
    return ok({ requests: preset.value.members, presets: [preset.value] })
  }
  const parsed = packRequestSchema.safeParse(
    omitBy({ ...request, content: params.content ?? pack.content }, (value) => value === undefined)
  )
  if (!parsed.success) {
    return err(installationError({ kind: 'invalid', message: parsed.error.message }))
  }
  return ok({ requests: [parsed.data], presets: [] })
}
