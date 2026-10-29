import { standardsPlugin } from '#/standards/plugin.ts'

/**
 * Create the recommended opt-in registrations without initializing a client.
 * @returns A readonly tuple retaining each plugin's namespace and capability types.
 * @example
 * const client = granary({ plugins: defaultPlugins() })
 */
export function defaultPlugins(): readonly [ReturnType<typeof standardsPlugin>] {
  return [standardsPlugin()] as const
}
