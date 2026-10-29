import { err, isErr, ok } from 'massaman/control'
import type { Outcome } from '#/outcome.ts'

import { createFilesystemClient } from '#/filesystem.ts'
import { installationError } from '#/installation/errors.ts'
import type { InstallationError } from '#/installation/errors.ts'
import { manifestSchema } from '#/manifests/schema.ts'

export type ConfigurationClient = {
  readonly readPlugin: (options: {
    readonly name: string
  }) => Promise<Outcome<unknown, InstallationError>>
  readonly configurePlugin: (options: {
    readonly name: string
    readonly value: unknown
  }) => Promise<Outcome<void, InstallationError>>
}

/**
 * Bind namespaced plugin configuration to a checked workspace manifest.
 * @param options - Project containing granary.json; reads never cache intent.
 * @returns Read-only plugin data and explicit atomic configuration writes.
 * @example
 * const config = await createConfigurationClient({ project: process.cwd() }).readPlugin({ name: 'standards' })
 */
export function createConfigurationClient({
  project,
}: {
  readonly project: string
}): ConfigurationClient {
  const filesystem = createFilesystemClient({ root: project })
  return Object.freeze({
    async readPlugin({ name }) {
      const present = await filesystem.exists({ path: 'granary.json' })
      if (isErr(present)) return present
      if (!present.value) return ok(undefined)
      const document = await filesystem.readJSON({ path: 'granary.json', schema: manifestSchema })
      if (isErr(document)) return document
      return ok(document.value.plugins?.[name])
    },
    async configurePlugin({ name, value }) {
      const document = await filesystem.readJSON({ path: 'granary.json', schema: manifestSchema })
      if (isErr(document)) return document
      const updated = manifestSchema.safeParse({
        ...document.value,
        plugins: { ...document.value.plugins, [name]: value },
      })
      if (!updated.success)
        return err(installationError({ kind: 'invalid', message: updated.error.message }))
      return filesystem.write({
        path: 'granary.json',
        content: `${JSON.stringify(updated.data, null, 2)}\n`,
      })
    },
  })
}
