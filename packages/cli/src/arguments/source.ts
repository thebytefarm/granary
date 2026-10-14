import { sourceSchema } from '@granary/core'

/**
 * Interpret source locators while keeping package names separate from Git locators.
 */
export function parseSource({
  locator,
  ref,
}: {
  readonly locator: string
  readonly ref: string | undefined
}): ReturnType<typeof sourceSchema.safeParse> {
  return sourceSchema.safeParse(sourceFromLocator({ locator, ref }))
}

/**
 * @private
 */
function sourceFromLocator({
  locator,
  ref,
}: {
  readonly locator: string
  readonly ref: string | undefined
}): unknown {
  if (locator.startsWith('file:') && !locator.startsWith('file://')) {
    return { kind: 'local', path: locator.slice(5) }
  }
  if (locator.startsWith('git+')) {
    const [repository, revision, extra] = locator.slice(4).split('#')
    if (extra !== undefined) {
      return undefined
    }
    return { kind: 'git', repository, ref: ref ?? revision ?? 'HEAD' }
  }
  if (/^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/.test(locator) && !locator.startsWith('.')) {
    return { kind: 'git', repository: `https://github.com/${locator}.git`, ref: ref ?? 'HEAD' }
  }
  if (/^(https:\/\/|ssh:\/\/|git@|file:\/\/)/.test(locator)) {
    return { kind: 'git', repository: locator, ref: ref ?? 'HEAD' }
  }
  return { kind: 'local', path: locator }
}
