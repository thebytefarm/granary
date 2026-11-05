import { cli } from 'maltty'

import { add } from '#/commands/add.ts'
import { create } from '#/commands/create.ts'
import { install } from '#/commands/install.ts'
import { init } from '#/commands/init.ts'
import { list } from '#/commands/list.ts'
import { validate } from '#/commands/validate.ts'
import { standards } from '#/commands/standards.ts'
import { update } from '#/commands/update.ts'

import packageJson from '#/package.json' with { type: 'json' }

/**
 * Run the terminal application without starting it when imported as a library.
 * @param options - Version defaults to this package; a distribution may supply its own version.
 * @returns Completion after command execution.
 * @example
 * await run()
 */
export async function run({
  version = packageJson.version,
}: { readonly version?: string } = {}): Promise<void> {
  await cli({
    name: 'granary',
    version,
    description: 'Ship context. Give coding agents local docs and source.',
    commands: { init, create, validate, add, install, list, standards, update },
  })
}
