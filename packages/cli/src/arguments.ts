import { resolve } from 'node:path'

import type { CommandContext } from 'maltty'
import { z } from 'zod'

import type { SourceInput } from '@granary/core'
import { sourceInputSchema } from '@granary/core/schemas'

export const sourceArgumentsSchema = z.object({
  source: z.string().min(1),
  branch: z.string().optional(),
  tag: z.string().optional(),
  commit: z.string().optional(),
})

/**
 * Resolve the framework's directory argument without changing process-global state.
 * @param ctx - Current maltty command context.
 * @returns Absolute workspace directory.
 */
export function projectDirectory(ctx: CommandContext): string {
  if (typeof ctx.args.cwd === 'string') {
    return resolve(ctx.args.cwd)
  }
  return process.cwd()
}

/**
 * Normalize CLI locators into the SDK's structured source contract.
 * @param options - Locator and mutually exclusive revision arguments.
 * @returns Validated source intent, without opening the source.
 */
export function parseSource(
  options: z.infer<typeof sourceArgumentsSchema>
): ReturnType<typeof sourceInputSchema.safeParse> {
  const { source: locator, branch, tag, commit } = options
  if (locator.split('#').length > 2) {
    return sourceInputSchema.safeParse(undefined)
  }
  const revision = { branch, tag, commit }
  const selector = Object.fromEntries(
    Object.entries(revision).filter(([, value]) => value !== undefined)
  )
  const source = sourceFromLocator(locator)
  if (source.provider === 'local') {
    if (Object.keys(selector).length > 0) {
      return sourceInputSchema.safeParse({ ...source, revision: selector })
    }
    return sourceInputSchema.safeParse(source)
  }
  if (Object.keys(selector).length === 0) {
    return sourceInputSchema.safeParse(source)
  }
  return sourceInputSchema.safeParse({ ...source, revision: selector })
}

/**
 * @private
 */
function sourceFromLocator(locator: string): SourceInput {
  if (locator.startsWith('github:')) {
    const [owner = '', repo = '', ...name] = locator.slice(7).split('/')
    return { provider: 'github', owner, repo, pack: name.join('/') || undefined }
  }
  if (locator.startsWith('git+') || /^(https:\/\/|ssh:\/\/|git@|file:\/\/)/.test(locator)) {
    const repository = locator.replace(/^git\+/, '')
    const [url = '', pack] = repository.split('#')
    return { provider: 'git', repository: url, pack }
  }
  const [path = '', pack] = locator.replace(/^file:/, '').split('#')
  return { provider: 'local', path, pack }
}
