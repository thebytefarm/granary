import { resolve } from 'node:path'

import { command } from 'maltty'
import type { CommandContext } from 'maltty'
import { isErr } from 'massaman/control'
import { z } from 'zod'

import { manifestSchema } from '@granary/core/schemas'

import { projectDirectory } from '#/arguments.ts'
import {
  checkScaffoldDirectory,
  defaultDirectoryName,
  writeNewManifest,
} from '#/commands/scaffold.ts'

const packArgumentsSchema = z.object({
  directory: z.string().min(1),
  yes: z.boolean().default(false),
  name: z.string().optional(),
  description: z.string().optional(),
  packVersion: z.string().default('0.1.0'),
  include: z.array(z.string()).optional().transform(providedGlobs),
  exclude: z.array(z.string()).optional().transform(providedGlobs),
})

/**
 * Build the authoring command independently of consumer project initialization.
 * @param options - Terminal detection defaults to the process streams.
 * @returns A command that describes an explicit existing directory without installing it.
 */
export function createAuthoringCommand({
  isInteractive = () => Boolean(process.stdin.isTTY && process.stdout.isTTY),
}: { readonly isInteractive?: () => boolean } = {}): ReturnType<typeof command> {
  return command({
    description: 'Create a reusable pack from existing reference material',
    positionals: {
      directory: {
        type: 'string',
        required: true,
        description: 'Existing pack directory, relative to --cwd',
      },
    },
    options: {
      yes: {
        type: 'boolean',
        default: false,
        description: 'Write the pack manifest without prompts',
      },
      name: {
        type: 'string',
        description: 'Reusable pack identity (defaults to the target directory name)',
      },
      description: { type: 'string', description: 'Describe when this material is useful' },
      'pack-version': {
        type: 'string',
        default: '0.1.0',
        description: 'Authored version label, not the CLI version',
      },
      include: {
        type: 'array',
        default: [],
        description: 'Source-relative include globs (default: **/*.md)',
      },
      exclude: { type: 'array', default: [], description: 'Source-relative exclude globs' },
    },
    handler: async (ctx) => {
      const args = packArgumentsSchema.safeParse(ctx.args)
      if (!args.success) {
        return ctx.fail(args.error.message)
      }
      const directory = resolve(projectDirectory(ctx), args.data.directory)
      const available = await checkScaffoldDirectory(directory)
      if (isErr(available)) {
        return ctx.fail(available.error.message)
      }
      if (!args.data.yes && !isInteractive()) {
        return ctx.fail(
          'Pack authoring requires an interactive terminal. Use granary create <directory> --yes to scaffold without prompts.'
        )
      }
      const defaults = {
        name: args.data.name ?? defaultDirectoryName(directory),
        description: optionalText(args.data.description),
        version: optionalText(args.data.packVersion),
        files: { include: args.data.include ?? ['**/*.md'], exclude: args.data.exclude },
      }
      const document = await packDocument({ ctx, args: args.data, defaults })
      const parsed = manifestSchema.safeParse(document)
      if (!parsed.success) {
        return ctx.fail(parsed.error.message)
      }
      if (!args.data.yes) {
        ctx.log.info(`Pack directory: ${directory}\n${JSON.stringify(parsed.data, null, 2)}`)
        const confirmed = await ctx.prompts.confirm({
          message: 'Create this reusable pack definition?',
          initialValue: true,
        })
        if (!confirmed) {
          ctx.log.info('Pack creation cancelled. No files changed.')
          return
        }
      }
      const written = await writeNewManifest({ directory, document: parsed.data })
      if (isErr(written)) {
        return ctx.fail(written.error.message)
      }
      ctx.log.info(
        `Created pack definition in ${directory}. Validate it with granary validate --cwd <pack-directory>, then adopt it from a separate project with granary add <pack-directory>.`
      )
    },
  })
}

export const create = createAuthoringCommand()

/**
 * @private
 */
async function packDocument({
  ctx,
  args,
  defaults,
}: {
  readonly ctx: CommandContext
  readonly args: z.infer<typeof packArgumentsSchema>
  readonly defaults: z.infer<typeof manifestSchema>
}): Promise<unknown> {
  if (args.yes) {
    return defaults
  }
  const name = await ctx.prompts.text({
    message: 'Pack identity',
    initialValue: defaults.name,
    validate: (value) => {
      if (!manifestSchema.safeParse({ name: value }).success) {
        return 'Use lowercase letters and numbers separated by hyphens or slashes.'
      }
      return undefined
    },
  })
  const description = await ctx.prompts.text({
    message: 'When is this pack useful? (optional)',
    initialValue: defaults.description ?? '',
  })
  const version = await ctx.prompts.text({
    message: 'Pack version label (optional)',
    initialValue: defaults.version ?? '',
  })
  const include = await selectGlobs({
    ctx,
    supplied: args.include,
    message: 'Include glob',
    initialValue: '**/*.md',
    required: true,
  })
  const exclude = await selectGlobs({
    ctx,
    supplied: args.exclude,
    message: 'Exclude glob (optional)',
    required: false,
  })
  return {
    name,
    description: optionalText(description),
    version: optionalText(version),
    files: { include, exclude },
  }
}

/**
 * @private
 */
async function selectGlobs({
  ctx,
  supplied,
  message,
  initialValue,
  required,
}: {
  readonly ctx: CommandContext
  readonly supplied: readonly string[] | undefined
  readonly message: string
  readonly initialValue?: string
  readonly required: boolean
}): Promise<readonly string[]> {
  if (supplied !== undefined) {
    return supplied
  }
  const value = await ctx.prompts.text({
    message,
    initialValue: initialValue ?? '',
    validate: (input) => {
      if (!required && !input?.trim()) {
        return undefined
      }
      const parsed = manifestSchema.safeParse({ name: 'pack', files: { include: [input?.trim()] } })
      if (!parsed.success) {
        return 'Enter a positive, source-relative glob without absolute paths or parent traversal.'
      }
      return undefined
    },
  })
  if (!value.trim()) {
    return []
  }
  return [value.trim()]
}

/**
 * @private
 */
function optionalText(value: string | undefined): string | undefined {
  if (!value?.trim()) {
    return undefined
  }
  return value.trim()
}

/**
 * @private
 */
function providedGlobs(values: readonly string[] | undefined): readonly string[] | undefined {
  if (!values || values.length === 0) {
    return undefined
  }
  return values
}
