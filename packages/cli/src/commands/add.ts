import { command } from 'maltty'
import type { CommandContext } from 'maltty'
import { config } from 'maltty/config'
import { isErr } from 'massaman/control'

import { addPacks, findPacks, projectConfigSchema } from '@granary/core'
import type { Source } from '@granary/core'

import { addArgsSchema } from '../arguments/add.js'
import type { AddArgs } from '../arguments/add.js'
import { parseSource } from '../arguments/source.js'
import { loadProjectConfig, projectDirectory } from '../project/config.js'

/**
 * Install selected local or Git-backed context packs and persist their resolutions.
 */
export const add = command({
  description: 'Install local or Git leaf and composite context packs',
  positionals: {
    source: { type: 'string', required: true, description: 'Local path, Git URL, or owner/repo' },
  },
  options: {
    pack: { type: 'array', description: 'Full leaf/composite identities or unambiguous slugs' },
    content: {
      type: 'array',
      choices: ['docs', 'code', 'examples'],
      description: 'Selected content groups for leaf packs',
    },
    ref: { type: 'string', description: 'Git definition ref (default HEAD)' },
    'package-version': {
      type: 'string',
      description: 'Exact mapped package/content version or preset definition version',
    },
    output: { type: 'string', description: 'Persisted relative destination override' },
    'install-dir': { type: 'string', description: 'Persisted documentation destination override' },
    'code-dir': { type: 'string', description: 'Hidden repository-code destination override' },
    list: { type: 'boolean', default: false, description: 'Find packs without installing' },
  },
  middleware: [config({ name: 'granary', schema: projectConfigSchema })],
  handler: handleAdd,
})

/**
 * @private
 */
async function handleAdd(ctx: CommandContext): Promise<void> {
  const parsed = addArgsSchema.safeParse({
    ...ctx.args,
    version: ctx.args.packageVersion ?? ctx.args['package-version'],
    output: ctx.args.installDir ?? ctx.args['install-dir'] ?? ctx.args.output,
    codeOutput: ctx.args.codeDir ?? ctx.args['code-dir'],
  })
  if (!parsed.success) {
    return ctx.fail(parsed.error.message)
  }
  return addSelectedPacks({ ctx, args: parsed.data })
}

/**
 * @private
 */
async function addSelectedPacks({
  ctx,
  args,
}: {
  readonly ctx: CommandContext
  readonly args: AddArgs
}): Promise<void> {
  const project = projectDirectory(ctx)
  const source = parseSource({ locator: args.source, ref: args.ref })
  if (!source.success) {
    return ctx.fail(source.error.message)
  }
  if (args.ref && source.data.kind === 'local') {
    return ctx.fail('--ref requires a Git source.')
  }
  if (args.list) {
    return showAvailablePacks({ ctx, project, source: source.data })
  }
  const config = await loadProjectConfig({ ctx, project, required: false })
  const result = await addPacks({
    project,
    config,
    source: source.data,
    packs: args.pack,
    content: args.content,
    version: args.version,
    output: args.output,
    codeOutput: args.codeOutput,
  })
  if (isErr(result)) {
    return ctx.fail(result.error.message)
  }
  ctx.log.info(
    `Installed context. ${result.value.packs.length} pack(s) locked. ${(result.value.presets ?? []).length} composite(s) recorded.`
  )
}

/**
 * @private
 */
async function showAvailablePacks({
  ctx,
  project,
  source,
}: {
  readonly ctx: CommandContext
  readonly project: string
  readonly source: Source
}): Promise<void> {
  const found = await findPacks({ project, source })
  if (isErr(found)) {
    return ctx.fail(found.error.message)
  }
  ctx.log.info(
    found.value
      .map((pack) => `${pack.name}\t${pack.kind}\t${pack.content.join(', ')}\t${pack.description}`)
      .join('\n') || 'No packs found.'
  )
}
