import { glob, lstat, readFile } from 'node:fs/promises'
import { join, resolve as absolutePath } from 'node:path'

import type { CommandContext } from 'maltty'
import { attempt, attemptAsync, isErr } from 'massaman/control'

import { catalogSchema, projectConfigSchema, readCatalogProject } from '@granary/core'
import type { ProjectConfig } from '@granary/core'

/**
 * Read the framework's working-directory option without changing process-global state.
 */
export function projectDirectory(ctx: CommandContext): string {
  if (typeof ctx.args.cwd === 'string') {
    return absolutePath(ctx.args.cwd)
  }
  return process.cwd()
}

/**
 * Load consumer intent through maltty, distinguishing missing config from invalid config.
 */
export async function loadProjectConfig({
  ctx,
  project,
  required,
}: {
  readonly ctx: CommandContext
  readonly project: string
  readonly required: boolean
}): Promise<ProjectConfig> {
  await rejectAlternativeConfigurations({ ctx, project })
  const manifest = await attemptAsync(() => readFile(join(project, 'granary.json'), 'utf8'))
  if (!isErr(manifest)) {
    const parsed = attempt((): unknown => JSON.parse(manifest.value))
    if (isErr(parsed)) {
      return ctx.fail(parsed.error.message)
    }
    if (
      typeof parsed.value === 'object' &&
      parsed.value !== null &&
      'schemaVersion' in parsed.value
    ) {
      const document = catalogSchema.safeParse(parsed.value)
      if (!document.success) {
        return ctx.fail(document.error.message)
      }
      const legacy = await attemptAsync(() => lstat(join(project, 'granary.config.json')))
      if (!isErr(legacy)) {
        return ctx.fail('Competing consumer intent: granary.json and granary.config.json.')
      }
      if (!('code' in legacy.error) || legacy.error.code !== 'ENOENT') {
        return ctx.fail(legacy.error.message)
      }
      const config = await readCatalogProject({ project })
      if (isErr(config)) {
        return ctx.fail(config.error.message)
      }
      return config.value
    }
  } else if (!('code' in manifest.error) || manifest.error.code !== 'ENOENT') {
    return ctx.fail(manifest.error.message)
  }
  const status = await attemptAsync(() => lstat(join(project, 'granary.config.json')))
  if (isErr(status)) {
    if ('code' in status.error && status.error.code === 'ENOENT') {
      return missingProjectConfig({ ctx, required })
    }
    return ctx.fail(status.error.message)
  }
  if (status.value.isSymbolicLink()) {
    return ctx.fail('Consumer configuration must not be a symlink.')
  }
  const loaded = await ctx.config.load({ exitOnError: true })
  const parsed = projectConfigSchema.safeParse(loaded.config)
  if (!parsed.success) {
    return ctx.fail(parsed.error.message)
  }
  return parsed.data
}

/**
 * @private
 */
async function missingProjectConfig({
  ctx,
  required,
}: {
  readonly ctx: CommandContext
  readonly required: boolean
}): Promise<ProjectConfig> {
  if (required) {
    return ctx.fail('Missing granary.config.json. Add a pack first.')
  }
  return {
    output: '.context',
    codeOutput: '.context/repos',
    packs: [],
    document: { schemaVersion: 1 },
  }
}

/**
 * @private
 */
async function rejectAlternativeConfigurations({
  ctx,
  project,
}: {
  readonly ctx: CommandContext
  readonly project: string
}): Promise<void> {
  const alternatives = await attemptAsync(() =>
    Array.fromAsync(glob('granary.config.*', { cwd: project }))
  )
  if (isErr(alternatives)) {
    return ctx.fail(alternatives.error.message)
  }
  if (alternatives.value.some((path) => path !== 'granary.config.json')) {
    return ctx.fail('Installer consumer configuration must be granary.config.json.')
  }
}
