import { resolve } from 'node:path'

import { isErr } from 'massaman/control'

import { createContentClient } from '#/content/client.ts'
import type { ContentClient } from '#/content/client.ts'
import { installationError } from '#/installation/errors.ts'
import { createLocksClient } from '#/locks/client.ts'
import type { LocksClient } from '#/locks/client.ts'
import { createPacksClient } from '#/packs/client.ts'
import type { PacksClient } from '#/packs/client.ts'
import { composePlugins } from '#/plugins/compose.ts'
import type { PluginCapabilities, PluginDefinition } from '#/plugins/define.ts'
import { createUpdatesClient } from '#/updates/client.ts'
import type { UpdatesClient } from '#/updates/client.ts'

export type CreateGranaryOptions<Plugins extends readonly PluginDefinition[] = readonly []> = {
  readonly project: string
  readonly plugins?: Plugins | undefined
}
export type BaseGranaryClient<Plugins extends readonly PluginDefinition[] = readonly []> = {
  readonly packs: PacksClient
  readonly locks: LocksClient
  readonly updates: UpdatesClient
  readonly content: ContentClient
} & PluginCapabilities<Plugins>

/**
 * Construct a minimal workspace client and initialize each registered plugin once.
 * @param options - Workspace directory and an array of synchronous plugin registrations.
 * @returns A readonly client; construction performs no I/O apart from trusted plugin setup.
 * @throws An error with kind `invalid` for invalid options or plugin registrations/setup.
 * @example
 * const client = createGranary({ project: process.cwd(), plugins: [] })
 */
export function createGranary<const Plugins extends readonly PluginDefinition[] = readonly []>({
  project,
  plugins,
}: CreateGranaryOptions<Plugins>): BaseGranaryClient<Plugins> {
  if (typeof project !== 'string' || project.trim().length === 0) {
    throw installationError({ kind: 'invalid', message: 'Provide a nonempty project directory.' })
  }
  const root = resolve(project)
  const content = createContentClient({ project: root })
  const context = Object.freeze({ project: root, content })
  const capabilities = composePlugins({ registrations: plugins ?? [], context })
  if (isErr(capabilities)) {
    throw capabilities.error
  }
  const client = Object.freeze({
    packs: createPacksClient({ project: root }),
    locks: createLocksClient({ project: root }),
    updates: createUpdatesClient({
      project: root,
      validators: (plugins ?? []).flatMap((plugin) => {
        if (!plugin.validateUpdate) return []
        return [plugin.validateUpdate]
      }),
    }),
    content,
    ...capabilities.value,
  })
  // Composition validates every unique literal name before mounting its capability.
  return client as BaseGranaryClient<Plugins>
}
