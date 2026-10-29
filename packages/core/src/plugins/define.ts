import type { ContentClient } from '#/content/client.ts'
import type { UpdateValidator } from '#/plugins/validation.ts'

/** Read-only project capabilities supplied separately for every client construction. */
export type PluginContext = {
  readonly project: string
  readonly content: ContentClient
}

/** A registration captures configuration; setup synchronously builds a per-client capability. */
export type PluginDefinition<
  Name extends string = string,
  Capability extends Readonly<Record<string, unknown>> = Readonly<Record<string, unknown>>,
> = {
  readonly name: Name
  readonly setup: (context: PluginContext) => Capability
  readonly validateUpdate?: UpdateValidator | undefined
}

/** Preserve plugin names and capabilities when mapping an array into client namespaces. */
export type PluginCapabilities<Plugins extends readonly PluginDefinition[]> = {
  readonly [Plugin in Plugins[number] as Plugin['name']]: Readonly<ReturnType<Plugin['setup']>>
}

/**
 * Define a callable plugin factory with no configuration or typed configuration options.
 * @param definition - A definition object or arrow callback returning a configured definition.
 * @returns A factory; setup is deferred until client construction and never runs here.
 * @example
 * const example = definePlugin({ name: 'example', setup() { return { greet: () => 'hello' } } })
 * const registration = example()
 */
export function definePlugin<
  const Name extends string,
  Capability extends Readonly<Record<string, unknown>>,
>(definition: PluginDefinition<Name, Capability>): () => PluginDefinition<Name, Capability>
export function definePlugin<
  Options extends readonly unknown[],
  const Name extends string,
  Capability extends Readonly<Record<string, unknown>>,
>(
  definition: (...options: Options) => PluginDefinition<Name, Capability>
): (...options: Options) => PluginDefinition<Name, Capability>
export function definePlugin<
  Options extends readonly unknown[],
  const Name extends string,
  Capability extends Readonly<Record<string, unknown>>,
>(
  definition:
    | PluginDefinition<Name, Capability>
    | ((...options: Options) => PluginDefinition<Name, Capability>)
): (...options: Options) => PluginDefinition<Name, Capability> {
  if (typeof definition === 'function') {
    return (...options) => Object.freeze(definition(...options))
  }
  return () => Object.freeze({ ...definition })
}
