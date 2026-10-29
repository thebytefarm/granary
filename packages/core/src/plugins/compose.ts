import { attempt, err, isErr, ok } from 'massaman/control'
import type { Result } from 'massaman/control'

import type { PluginContext, PluginDefinition } from '#/plugins/define.ts'

export type PluginError = Error & { readonly kind: 'invalid' }

/**
 * Validate registrations before initializing any plugin, then mount readonly capabilities.
 * @param options - Registrations and the read-only resources available during synchronous setup.
 * @returns Capabilities keyed by unique names or the failing registration's error.
 */
export function composePlugins({
  registrations,
  context,
}: {
  readonly registrations: readonly PluginDefinition[]
  readonly context: PluginContext
}): Result<Readonly<Record<string, unknown>>, PluginError> {
  if (
    !Array.isArray(registrations) ||
    registrations.some((plugin) => !isPluginDefinition(plugin))
  ) {
    return invalid(
      'Plugins must be an array of named definitions with synchronous setup functions.'
    )
  }
  const names = registrations.map((plugin) => plugin.name)
  const reserved = [
    'then',
    'constructor',
    'prototype',
    '__proto__',
    'toJSON',
    'packs',
    'locks',
    'updates',
    'content',
  ]
  if (names.some((name, index) => reserved.includes(name) || names.indexOf(name) !== index)) {
    return invalid(
      'Plugin names must be unique and must not collide with core or reserved capabilities.'
    )
  }
  if (names.some((name) => !/^[a-z][a-zA-Z0-9]*$/.test(name))) {
    return invalid('Plugins require a safe namespace and a synchronous setup function.')
  }
  const initialized = registrations.map((plugin) => {
    const result = attempt(() => plugin.setup(context))
    if (isErr(result)) {
      return invalid(`Plugin setup failed: ${plugin.name}.`, result.error)
    }
    if (result.value === null || typeof result.value !== 'object' || 'then' in result.value) {
      if (result.value instanceof Promise) {
        void result.value.catch(() => undefined)
      }
      return invalid(`Plugin setup must return a synchronous capability object: ${plugin.name}.`)
    }
    const capability = attempt(() => Object.freeze({ ...result.value }))
    if (isErr(capability)) {
      return invalid(`Plugin capability failed: ${plugin.name}.`, capability.error)
    }
    return ok([plugin.name, capability.value] as const)
  })
  const failed = initialized.find(isErr)
  if (failed) {
    return failed
  }
  return ok(
    Object.fromEntries(
      initialized.flatMap((result) => {
        if (isErr(result)) {
          return []
        }
        return [result.value]
      })
    )
  )
}

/**
 * @private
 */
function invalid(message: string, cause?: unknown): Result<never, PluginError> {
  return err(Object.assign(new Error(message, { cause }), { kind: 'invalid' as const }))
}

/**
 * @private
 */
function isPluginDefinition(value: unknown): value is PluginDefinition {
  return (
    typeof value === 'object' &&
    value !== null &&
    'name' in value &&
    typeof value.name === 'string' &&
    'setup' in value &&
    typeof value.setup === 'function' &&
    (!('validateUpdate' in value) ||
      value.validateUpdate === undefined ||
      typeof value.validateUpdate === 'function')
  )
}
