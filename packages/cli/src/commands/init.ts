import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

import { command } from 'maltty'
import type { CommandContext } from 'maltty'
import { attemptAsync, isErr, ok } from 'massaman/control'
import { flow } from 'massaman/function'
import { kebabCase } from 'massaman/string'
import { z } from 'zod'

import { manifestSchema } from '@granary/core/schemas'
import { granary } from '@granary/sdk'

import { projectDirectory } from '#/arguments.ts'
import { createAdoptionResolver } from '#/catalog/nextjs.ts'
import {
  detectPrebuiltPacks,
  prebuiltNameSchema,
  prebuiltPacks,
  prebuiltSelections,
} from '#/catalog/prebuilt.ts'
import type { PrebuiltName } from '#/catalog/prebuilt.ts'
import {
  checkScaffoldDirectory,
  defaultDirectoryName,
  writeNewManifest,
} from '#/commands/scaffold.ts'

/**
 * Build the initialization command with an injectable terminal capability.
 * @param options - Terminal detection defaults to the process streams.
 * @returns A scaffold command with maltty's guided setup in interactive terminals.
 */
export function createInitCommand({
  isInteractive = () => Boolean(process.stdin.isTTY && process.stdout.isTTY),
}: { readonly isInteractive?: () => boolean } = {}): ReturnType<typeof command> {
  return command({
    description: 'Set up Granary at the consuming project root',
    options: {
      yes: {
        type: 'boolean',
        default: false,
        description: 'Skip prompts; install only explicitly selected --preset packs',
      },
      name: {
        type: 'string',
        description: 'Project name (defaults to package.json, then the directory name)',
      },
      preset: {
        type: 'array',
        default: [],
        description:
          'Packs to install: nextjs, react, tanstack-query, tanstack-router, tanstack-start, hono, zod, ai-sdk, recommended-typescript, recommended-rust, recommended-python',
      },
    },
    handler: async (ctx) => {
      const args = z
        .object({
          yes: z.boolean().default(false),
          name: z.string().optional(),
          preset: z.array(prebuiltNameSchema).default([]),
        })
        .safeParse(ctx.args)
      if (!args.success) {
        return ctx.fail(args.error.message)
      }
      const project = projectDirectory(ctx)
      const available = await checkScaffoldDirectory(project)
      if (isErr(available)) {
        return ctx.fail(available.error.message)
      }
      if (!args.data.yes && !isInteractive()) {
        return ctx.fail(
          'Guided setup requires an interactive terminal. Use granary init --yes to create an empty scaffold.'
        )
      }
      const suggestedName = await defaultProjectName(project)
      const name = args.data.name ?? suggestedName
      if (args.data.yes) {
        if (args.data.preset.length > 0) {
          return installPrebuilt({ ctx, project, name, presets: args.data.preset })
        }
        return writeScaffold({ ctx, project, name })
      }
      const detected = await detectPrebuiltPacks(project)
      if (detected.length > 0) {
        ctx.log.info(
          `Detected context matches: ${detected.map((name) => prebuiltPacks.find((pack) => pack.name === name)?.label ?? name).join(', ')}`
        )
      }
      const recommended = preferredPresets({ explicit: args.data.preset, detected })
      const answers = await promptSetup({ ctx, name, recommended })
      const selected = z.array(prebuiltNameSchema).safeParse(answers.presets ?? [])
      if (!selected.success) {
        return ctx.fail(selected.error.message)
      }
      const manifest = manifestSchema.safeParse({
        name: answers.name,
        packs: prebuiltSelections(selected.data),
      })
      if (!manifest.success) {
        return ctx.fail(manifest.error.message)
      }
      ctx.log.info(JSON.stringify(manifest.data, null, 2))
      if (answers.source) {
        ctx.log.info(`First source: ${answers.source}`)
      }
      const confirmed = await ctx.prompts.confirm({
        message: 'Proceed with this setup?',
        initialValue: true,
      })
      if (!confirmed) {
        ctx.log.info('Setup cancelled. No files changed.')
        return
      }
      if (selected.data.length > 0) {
        return installPrebuilt({ ctx, project, name: manifest.data.name, presets: selected.data })
      }
      const adoption = await resolveSetupSource(answers.source)
      if (isErr(adoption)) {
        return ctx.fail(adoption.error.message)
      }
      const written = await writeNewManifest({ directory: project, document: manifest.data })
      if (isErr(written)) {
        return ctx.fail(written.error.message)
      }
      if (!adoption.value) {
        reportScaffold(ctx)
        return
      }
      if (adoption.value.summary) {
        ctx.log.info(adoption.value.summary)
      }
      const result = await granary({ project }).packs.add(adoption.value)
      if (isErr(result)) {
        return ctx.fail(
          `Created granary.json, but installation failed: ${result.error.message}. Retry with granary add <source>.`
        )
      }
      ctx.log.info(`Installed context. ${result.value.packs.length} pack(s) locked.`)
    },
  })
}

export const init = createInitCommand()

/**
 * @private
 */
function preferredPresets({
  explicit,
  detected,
}: {
  readonly explicit: readonly PrebuiltName[]
  readonly detected: readonly PrebuiltName[]
}): readonly PrebuiltName[] {
  if (explicit.length > 0) {
    return explicit
  }
  return detected
}

/**
 * @private
 */
async function promptSetup({
  ctx,
  name,
  recommended,
}: {
  readonly ctx: CommandContext
  readonly name: string
  readonly recommended: readonly PrebuiltName[]
}) {
  const projectName = await ctx.prompts.text({
    message: 'Project name',
    initialValue: name,
    validate: (value) => {
      if (!manifestSchema.safeParse({ name: value }).success) {
        return 'Use lowercase letters and numbers separated by hyphens or slashes.'
      }
      return undefined
    },
  })
  const setup = await ctx.prompts.select({
    message: 'What context does this project need?',
    options: [
      {
        value: 'prebuilt',
        label: 'Choose context packs',
        hint: 'Detected tool documentation and optional Bytefarm standards',
      },
      {
        value: 'empty',
        label: 'Set up configuration only',
        hint: 'Add context later with granary add',
      },
      {
        value: 'source',
        label: 'Install initial context',
        hint: 'Local pack, Git repository, or nextjs@16',
      },
    ],
    initialValue: 'prebuilt',
  })
  if (setup === 'prebuilt') {
    const presets = await ctx.prompts.multiselect({
      message: 'Select context packs (detected matches are preselected)',
      options: prebuiltPacks.map((pack) => ({
        value: pack.name,
        label: pack.label,
        hint: pack.hint,
      })),
      initialValues: [...recommended],
      required: false,
    })
    return { name: projectName, presets }
  }
  if (setup === 'empty') {
    return { name: projectName }
  }
  const source = await ctx.prompts.text({
    message: 'Source to install',
    placeholder: 'file:../team-standards or nextjs@16',
    validate: (value) => {
      if (!value?.trim()) {
        return 'Enter a local path, Git source, or supported framework shorthand.'
      }
      return undefined
    },
  })
  return { name: projectName, source: source.trim() }
}

/**
 * @private
 */
async function installPrebuilt({
  ctx,
  project,
  name,
  presets,
}: {
  readonly ctx: CommandContext
  readonly project: string
  readonly name: string
  readonly presets: readonly PrebuiltName[]
}): Promise<void> {
  const written = await writeNewManifest({
    directory: project,
    document: { name, packs: prebuiltSelections(presets) },
  })
  if (isErr(written)) {
    return ctx.fail(written.error.message)
  }
  ctx.log.info('Installing selected context packs. Tool documentation requires Git/network access.')
  const installed = await granary({ project }).packs.install()
  if (isErr(installed)) {
    return ctx.fail(
      `Created granary.json, but prebuilt installation failed: ${installed.error.message}. Retry with granary install.`
    )
  }
  ctx.log.info(`Installed context. ${installed.value.packs.length} pack(s) locked.`)
}

/**
 * @private
 */
async function resolveSetupSource(source: string | undefined) {
  if (!source) {
    return ok(undefined)
  }
  return createAdoptionResolver()({ source })
}

/**
 * @private
 */
async function defaultProjectName(project: string): Promise<string> {
  const metadata = await attemptAsync(async (): Promise<unknown> =>
    JSON.parse(await readFile(join(project, 'package.json'), 'utf8'))
  )
  if (isErr(metadata)) {
    return defaultDirectoryName(project)
  }
  const parsed = z.object({ name: z.string().min(1) }).safeParse(metadata.value)
  if (!parsed.success) {
    return defaultDirectoryName(project)
  }
  const normalize = flow(
    (value: string) => value.replace(/^@/, '').split('/'),
    (segments) => segments.map((segment) => kebabCase(segment)),
    (segments) => segments.join('/')
  )
  const manifest = manifestSchema.safeParse({ name: normalize(parsed.data.name) })
  if (!manifest.success) {
    return defaultDirectoryName(project)
  }
  return manifest.data.name
}

/**
 * @private
 */
async function writeScaffold({
  ctx,
  project,
  name,
}: {
  readonly ctx: CommandContext
  readonly project: string
  readonly name: string
}): Promise<void> {
  const result = await writeNewManifest({ directory: project, document: { name, packs: {} } })
  if (isErr(result)) {
    return ctx.fail(result.error.message)
  }
  reportScaffold(ctx)
}

/**
 * @private
 */
function reportScaffold(ctx: CommandContext): void {
  ctx.log.info(
    'Created granary.json. Next: granary add <source> (for example, granary add nextjs@16).'
  )
}
