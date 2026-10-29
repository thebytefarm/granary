import { createGranary } from '@granary/core'
import type { BaseGranaryClient, PluginDefinition } from '@granary/core'

export type GranaryOptions<Plugins extends readonly PluginDefinition[] = readonly []> = {
  readonly project?: string | undefined
  readonly plugins?: Plugins | undefined
}
export type GranaryClient<Plugins extends readonly PluginDefinition[] = readonly []> =
  BaseGranaryClient<Plugins>

/**
 * Construct a project client without requiring plugins or performing project I/O.
 * @param options - Project defaults to the current directory; only explicitly registered plugins run.
 * @returns A readonly client with the capabilities inferred from its registrations.
 * @throws A classified construction error for invalid options or plugins.
 * @example
 * const client = granary()
 * const result = await client.packs.list()
 */
export function granary<const Plugins extends readonly PluginDefinition[] = readonly []>({
  project = process.cwd(),
  plugins,
}: GranaryOptions<Plugins> = {}): GranaryClient<Plugins> {
  return createGranary({ project, plugins })
}
