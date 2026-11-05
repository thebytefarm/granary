import { posix, relative, resolve } from 'node:path'

import { err, isErr, ok } from 'massaman/control'
import type { Result } from 'massaman/control'
import { omit } from 'massaman/object'
import { match, P } from 'massaman/match'
import { uniqBy } from 'massaman/array'
import { isEqual } from 'massaman/predicate'

import { installationError } from '#/installation/errors.ts'
import type { InstallationError } from '#/installation/errors.ts'
import { hashContent } from '#/content/hash.ts'
import { collectOutcomes } from '#/results.ts'
import { mapLimited } from '#/map-limited.ts'
import type { PackEntry, PackOptions, Manifest, Composition } from '#/manifests/schema.ts'
import type { PackRequest } from '#/workspace/config.ts'
import { createSourcesClient } from '#/sources/client.ts'
import type { OpenedSource, Source } from '#/sources/source.ts'
import { sourceReference } from '#/sources/source.ts'
import {
  isPackLocator,
  packDirectory,
  packDirectorySegment,
  parsePackLocator,
} from '#/sources/locator.ts'
import { readSourceDocument } from '#/manifests/read.ts'
import { readPackFiles } from '#/packs/selection.ts'
import { defaultContextOutput } from '#/workspace/paths.ts'

/**
 * Retain resolved leaf requests and explicit composition edges.
 */
export type Expansion = {
  readonly requests: readonly PackRequest[]
  readonly definitions: Composition['definitions']
  readonly ids: readonly string[]
}

/**
 * Scope a recursive expansion to an opened source and consumer destination.
 */
export type ExpandOptions = {
  readonly project: string
  readonly opened: OpenedSource
  readonly prefix: string
  readonly document: Manifest
  readonly output: string
  readonly destination?: string | undefined
  readonly chain: readonly string[]
  readonly locked?: Composition['definitions'] | undefined
}

export type CheckCompositionParams = {
  readonly project: string
  readonly resolution: Composition
}

/**
 * @private
 */
export type ExpandMembersParams = {
  readonly context: ExpandOptions
  readonly members: Readonly<Record<string, PackEntry>>
}
/**
 * @private
 */
type ExpandMemberParams = {
  readonly context: ExpandOptions
  readonly key: string
  readonly value: string | PackOptions
}
/**
 * @private
 */
type ExpandSourceParams = {
  readonly context: ExpandOptions
  readonly opened: OpenedSource
  readonly prefix: string
  readonly key: string
  readonly pack: string | undefined
  readonly options: PackOptions
}
/**
 * @private
 */
type ExpandInlineParams = {
  readonly context: ExpandOptions
  readonly key: string
  readonly authored: PackOptions
  readonly options: PackOptions
}
/**
 * @private
 */
type ExpandDefinitionParams = {
  readonly context: ExpandOptions
  readonly authored: PackOptions
  readonly options: PackOptions
  readonly label: string
  readonly identity: string
}
/**
 * @private
 */
type SelectPackParams = { readonly document: Manifest; readonly name: string | undefined }
/**
 * @private
 */
type SourceContextParams = { readonly context: ExpandOptions; readonly source: Source }
/**
 * @private
 */
type ChooseDestinationParams = {
  readonly context: ExpandOptions
  readonly options: PackOptions
  readonly fallback: string
}
/**
 * @private
 */
type RevisionSourceParams = { readonly source: Source; readonly value: string | PackOptions }
/**
 * @private
 */
type DefinitionIdParams = {
  readonly opened: OpenedSource
  readonly prefix: string
  readonly name: string
}

/**
 * Verify every locked source definition before restoring its selected payloads.
 */
export async function checkComposition({
  project,
  resolution,
}: CheckCompositionParams): Promise<Result<void, InstallationError>> {
  const checked = collectOutcomes(
    await mapLimited({
      items: resolution.definitions,
      concurrency: 2,
      transform: (definition) =>
        createSourcesClient().read({
          ...definition.origin,
          base: project,
          use: async (opened) => {
            const loaded = await readSourceDocument({ opened, prefix: definition.path })
            if (isErr(loaded)) {
              return loaded
            }
            if (loaded.value.hash !== definition.hash) {
              return err(
                installationError({
                  message: `Pack definition changed: ${definition.id}.`,
                  kind: 'drift',
                })
              )
            }
            return ok(undefined)
          },
        }),
    })
  )
  if (isErr(checked)) {
    return checked
  }
  const expanded = await expandMembers({
    context: {
      project,
      opened: { directory: project, source: { provider: 'local', path: '.' } },
      prefix: '.',
      document: resolution.document,
      output: resolution.document.output ?? defaultContextOutput,
      chain: [],
      locked: resolution.definitions,
    },
    members: resolution.document.packs ?? {},
  })
  if (isErr(expanded)) return expanded
  const definitions = uniqBy(expanded.value.definitions, (definition) => definition.id)
  if (
    definitions.length !== resolution.definitions.length ||
    definitions.some((definition, index) => {
      const locked = resolution.definitions[index]
      return (
        !locked ||
        definition.id !== locked.id ||
        definition.path !== locked.path ||
        definition.hash !== locked.hash ||
        definition.origin.revision !== locked.origin.revision ||
        !isEqual(definition.origin.source, locked.origin.source) ||
        !isEqual(definition.members, locked.members)
      )
    })
  ) {
    return err(
      installationError({
        kind: 'drift',
        message: 'Locked composition membership differs from its source definitions.',
      })
    )
  }
  return ok(undefined)
}

/**
 * Expand declared members with bounded source I/O.
 * @param options - Opened source context and explicit members, never discovered directories.
 * @returns Leaf requests and pinned composition definitions.
 */
export async function expandMembers({
  context,
  members,
}: ExpandMembersParams): Promise<Result<Expansion, InstallationError>> {
  const selections = Object.entries(members).flatMap(([key, entry]) =>
    entries(entry).map((value) => ({ key, value }))
  )
  const results = collectOutcomes(
    await mapLimited({
      items: selections,
      concurrency: 2,
      transform: (selection) => expandMember({ context, ...selection }),
    })
  )
  if (isErr(results)) {
    return results
  }
  return ok(combine(results.value))
}

/**
 * @private
 */
async function expandMember({
  context,
  key,
  value,
}: ExpandMemberParams): Promise<Result<Expansion, InstallationError>> {
  const options = entryOptions(value)
  const locator = options.source ?? key
  if (isPackLocator(key) && options.source) {
    return invalid(`Source-keyed entry ${key} must not repeat source.`)
  }
  if (locator.startsWith('#')) {
    const name = locator.slice(1)
    const sibling = selectPack({ document: context.document, name })
    if (isErr(sibling)) {
      return sibling
    }
    return expandInline({
      context,
      key: name,
      authored: sibling.value,
      options: omit(options, ['source']),
    })
  }
  if (!isPackLocator(locator)) {
    if (typeof value === 'string' || Array.isArray(value)) {
      return invalid(`Named pack ${key} needs an inline definition, not a Git revision.`)
    }
    return expandInline({ context, key, authored: options, options: {} })
  }
  const parsed = parsePackLocator({ locator, options })
  if (isErr(parsed)) {
    return parsed
  }
  if (typeof value === 'string' && parsed.value.source.provider !== 'git') {
    return invalid(`Non-Git source ${key} does not accept a Git revision.`)
  }
  const source = revisionSource({ source: parsed.value.source, value })
  const target = sourceContext({ context, source })
  if (isErr(target)) {
    return target
  }
  return createSourcesClient().read({
    source: target.value.source,
    revision:
      target.value.revision ??
      context.locked?.find(
        (definition) =>
          isEqual(definition.origin.source, target.value.source) &&
          definition.path === target.value.prefix &&
          definition.id.endsWith(`#${parsed.value.pack ?? ''}`)
      )?.origin.revision,
    base: context.project,
    use: (opened) =>
      expandSource({
        context,
        opened,
        prefix: target.value.prefix,
        key: locator,
        pack: parsed.value.pack,
        options,
      }),
  })
}

/**
 * @private
 */
async function expandSource({
  context,
  opened,
  prefix,
  key,
  pack,
  options,
}: ExpandSourceParams): Promise<Result<Expansion, InstallationError>> {
  const loaded = await readSourceDocument({ opened, prefix })
  if (isErr(loaded)) {
    return loaded
  }
  const selected = selectPack({ document: loaded.value.document, name: pack })
  if (isErr(selected)) {
    return selected
  }
  const id = definitionId({ opened, prefix, name: pack ?? '' })
  if (context.chain.includes(id) || context.chain.length >= 64) {
    return invalid(
      `Pack composition cycle or excessive depth: ${[...context.chain, id].join(' -> ')}.`
    )
  }
  const namespace = packDirectory(key)
  const revision = sourceLabel(opened.source)
  const destination = chooseDestination({
    context,
    options,
    fallback: posix.join(namespace, packDirectorySegment(revision)),
  })
  const nextContext: ExpandOptions = {
    ...context,
    opened,
    prefix,
    document: loaded.value.document,
    destination,
    chain: [...context.chain, id],
  }
  const expanded = await expandSelectedDefinition({
    context: nextContext,
    authored: selected.value,
    options,
    label: key,
    identity: `${key}@${revision}`,
  })
  if (isErr(expanded)) {
    return expanded
  }
  return ok({
    ...expanded.value,
    ids: [id],
    definitions: [
      {
        id,
        path: prefix,
        origin: { source: opened.source, revision: opened.revision },
        hash: loaded.value.hash,
        members: expanded.value.ids,
      },
      ...expanded.value.definitions,
    ],
  })
}

/**
 * @private
 */
async function expandInline({
  context,
  key,
  authored,
  options,
}: ExpandInlineParams): Promise<Result<Expansion, InstallationError>> {
  const id = definitionId({ opened: context.opened, prefix: context.prefix, name: key })
  if (context.chain.includes(id) || context.chain.length >= 64) {
    return invalid(
      `Pack composition cycle or excessive depth: ${[...context.chain, id].join(' -> ')}.`
    )
  }
  if (authored.source) {
    return expandMember({
      context: { ...context, chain: [...context.chain, id] },
      key,
      value: { ...authored, ...options },
    })
  }
  const destination = chooseDestination({
    context,
    options: { ...authored, ...options },
    fallback: packDirectory(key),
  })
  const expanded = await expandDefinition({
    context: { ...context, destination, chain: [...context.chain, id] },
    authored,
    options,
    label: key,
    identity: `${context.opened.source.provider}:${sourceIdentity(context.opened.source)}:${context.prefix}:${key}@${sourceLabel(context.opened.source)}`,
  })
  if (isErr(expanded)) {
    return expanded
  }
  const definition = await readSourceDocument(context)
  if (isErr(definition)) {
    return definition
  }
  return ok({
    ...expanded.value,
    ids: [id],
    definitions: [
      {
        id,
        path: context.prefix,
        origin: { source: context.opened.source, revision: context.opened.revision },
        hash: definition.value.hash,
        members: expanded.value.ids,
      },
      ...expanded.value.definitions,
    ],
  })
}

/**
 * @private
 */
async function expandDefinition({
  context,
  authored,
  options,
  label,
  identity,
}: ExpandDefinitionParams): Promise<Result<Expansion, InstallationError>> {
  const own = await ownRequest({ context, authored, options, label, identity })
  if (isErr(own)) {
    return own
  }
  const children = await expandMembers({
    context,
    members: { ...authored.packs, ...options.packs },
  })
  if (isErr(children)) {
    return children
  }
  return ok({ ...children.value, requests: [...own.value, ...children.value.requests] })
}

/**
 * @private
 */
async function expandSelectedDefinition(
  params: ExpandDefinitionParams
): Promise<Result<Expansion, InstallationError>> {
  if (params.authored.source) {
    return expandMember({
      context: params.context,
      key: 'selected',
      value: { ...params.authored, ...params.options, output: '.' },
    })
  }
  return expandDefinition(params)
}

/**
 * @private
 */
async function ownRequest({
  context,
  authored,
  options,
  label,
  identity,
}: ExpandDefinitionParams): Promise<Result<readonly PackRequest[], InstallationError>> {
  const files = await readPackFiles({ ...context, authored, options, label })
  if (isErr(files)) {
    return files
  }
  const selected = files.value.paths
  if (!selected.length) {
    return ok([])
  }
  const name = `pack-${hashContent(Buffer.from(`${identity}|${context.destination ?? ''}`)).slice(0, 24)}`
  return ok([
    {
      name,
      label,
      source: context.opened.source,
      revision: context.opened.revision,
      manifest: posix.join(context.prefix, 'granary.json'),
      content: ['docs'],
      output: context.output,
      destination: context.destination ?? context.output,
      selection: {
        docs: {
          path: context.prefix,
          entry: selected.find((path) => path === 'README.md') ?? selected[0] ?? '',
          files: selected,
          documents: files.value.documents,
        },
      },
    },
  ])
}

/**
 * @private
 */
function selectPack({ document, name }: SelectPackParams): Result<PackOptions, InstallationError> {
  if (!name) {
    return ok(document)
  }
  const direct = document.packs?.[name]
  if (direct !== undefined) {
    if (typeof direct === 'string' || isPackEntryList(direct)) {
      return invalid(`Named pack ${name} must be an authored object.`)
    }
    return ok(direct)
  }
  const aliases = Object.entries(document.packs ?? {}).filter(([key]) => key.endsWith(`/${name}`))
  if (aliases.length === 1) {
    return selectPack({ document, name: aliases[0]?.[0] })
  }
  const [head, ...rest] = name.split('/')
  const child = document.packs?.[head ?? '']
  if (child && typeof child === 'object' && !isPackEntryList(child) && rest.length) {
    return selectPack({ document: { ...child, name: head ?? 'pack' }, name: rest.join('/') })
  }
  return invalid(`Source does not declare pack: ${name}.`)
}

/**
 * @private
 */
function sourceContext({
  context,
  source,
}: SourceContextParams): Result<
  { readonly source: Source; readonly prefix: string; readonly revision?: string | undefined },
  InstallationError
> {
  if (source.provider !== 'local') {
    return ok({ source, prefix: '.' })
  }
  if (context.opened.source.provider !== 'local') {
    const prefix = posix.normalize(posix.join(context.prefix, source.path))
    if (prefix === '..' || prefix.startsWith('../') || posix.isAbsolute(source.path)) {
      return invalid('A Git-backed or built-in local member must stay inside its source snapshot.')
    }
    return ok({ source: context.opened.source, prefix, revision: context.opened.revision })
  }
  return ok({
    source: {
      provider: 'local',
      path:
        relative(context.project, resolve(context.opened.directory, context.prefix, source.path)) ||
        '.',
    },
    prefix: '.',
  })
}

/**
 * @private
 */
function chooseDestination({ context, options, fallback }: ChooseDestinationParams): string {
  if (options.output !== undefined) {
    return posix.join(context.destination ?? context.document.output ?? '.', options.output)
  }
  return posix.join(context.destination ?? context.output, options.output ?? fallback)
}

/**
 * @private
 */
function entries(entry: PackEntry): readonly (string | PackOptions)[] {
  return match(entry)
    .with(P.string, (value) => [value])
    .with(P.array(P._), (value) => value)
    .with(P.nonNullable, (value) => [value])
    .exhaustive()
}

/**
 * @private
 */
function entryOptions(entry: string | PackOptions): PackOptions {
  if (typeof entry === 'string') {
    return {}
  }
  return entry
}

/**
 * @private
 */
function revisionSource({ source, value }: RevisionSourceParams): Source {
  if (source.provider === 'git' && typeof value === 'string') {
    return { ...source, revision: value }
  }
  return source
}

/**
 * @private
 */
function sourceLabel(source: Source): string {
  if (source.provider === 'builtin') {
    return source.version
  }
  if (source.provider === 'git') {
    return sourceReference(source).replace(/^refs\/(?:heads|tags)\//, '')
  }
  return 'local'
}

/**
 * @private
 */
function sourceIdentity(source: Source): string {
  if (source.provider === 'builtin') {
    return `builtin:${source.name}@${source.version}`
  }
  if (source.provider === 'git') {
    return source.repository
  }
  return source.path
}

/**
 * @private
 */
function definitionId({ opened, prefix, name }: DefinitionIdParams): string {
  return `${prefix}|${sourceIdentity(opened.source)}@${opened.revision ?? 'local'}#${name}`
}

/**
 * @private
 */
function isPackEntryList(entry: PackEntry): entry is readonly (string | PackOptions)[] {
  return Array.isArray(entry)
}

/**
 * @private
 */
function combine(expansions: readonly Expansion[]): Expansion {
  return {
    requests: expansions.flatMap((entry) => entry.requests),
    definitions: expansions.flatMap((entry) => entry.definitions),
    ids: expansions.flatMap((entry) => entry.ids),
  }
}

/**
 * @private
 */
function invalid(message: string): Result<never, InstallationError> {
  return err(installationError({ kind: 'invalid', message }))
}
