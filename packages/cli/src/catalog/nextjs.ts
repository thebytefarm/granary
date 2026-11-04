import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

import { attemptAsync, err, isErr, ok } from 'massaman/control'
import type { Result } from 'massaman/control'
import type { z } from 'zod'

import type { SourceInput } from '@granary/core'

import { parseSource } from '#/arguments.ts'
import type { sourceArgumentsSchema } from '#/arguments.ts'

const execute = promisify(execFile)
const repository = 'https://github.com/vercel/next.js.git'
const stableVersion = '(?:0|[1-9][0-9]*)'
const selectionPattern = new RegExp(`^nextjs@(${stableVersion}(?:\\.${stableVersion}){0,2})$`)
const tagPattern = new RegExp(`^v${stableVersion}\\.${stableVersion}\\.${stableVersion}$`)

export type Adoption = {
  readonly source: SourceInput
  readonly files?: { readonly include: readonly string[] }
  readonly summary?: string
}

/**
 * Resolve CLI framework shorthand before passing explicit intent to the SDK.
 * @param options - Optional tag reader is the external Git service boundary.
 * @returns A resolver for Next.js 15/16 stable versions and existing source locators.
 */
export function createAdoptionResolver({
  readTags = readGitTags,
}: {
  readonly readTags?: typeof readGitTags
} = {}): (args: z.infer<typeof sourceArgumentsSchema>) => Promise<Result<Adoption>> {
  return async (args) => {
    if (args.source !== 'nextjs' && !args.source.startsWith('nextjs@')) {
      const parsed = parseSource(args)
      if (!parsed.success) {
        return err(parsed.error)
      }
      return ok({ source: parsed.data })
    }
    if ([args.branch, args.tag, args.commit].some((value) => value !== undefined)) {
      return err(new Error('Use nextjs@<version> without --branch, --tag, or --commit.'))
    }
    const version = selectionPattern.exec(args.source)?.[1]
    if (!version || !['15', '16'].includes(version.split('.')[0] ?? '')) {
      return err(
        new Error(
          'Use nextjs@15 or nextjs@16, optionally with a minor or exact stable version. Other releases and ranges require an explicit Git source and file selection.'
        )
      )
    }
    const tags = await readTags({ repository, pattern: `refs/tags/v${version}*` })
    if (isErr(tags)) {
      return tags
    }
    const selected = selectStableTag({ tags: tags.value, version })
    if (isErr(selected)) {
      return selected
    }
    return ok({
      source: {
        provider: 'github',
        owner: 'vercel',
        repo: 'next.js',
        revision: { tag: selected.value },
      },
      files: { include: ['docs/**'] },
      summary: `Resolved ${args.source} to github:vercel/next.js@${selected.value} (docs/**).`,
    })
  }
}

/**
 * Choose the highest stable Git tag matching a numeric major, minor, or exact release.
 * @param options - Advertised tag names and a validated numeric version prefix.
 * @returns An exact tag, never a prerelease or an adjacent major/minor.
 */
export function selectStableTag({
  tags,
  version,
}: {
  readonly tags: readonly string[]
  readonly version: string
}): Result<string> {
  const selected = tags
    .filter(
      (tag) => tagPattern.test(tag) && (tag === `v${version}` || tag.startsWith(`v${version}.`))
    )
    .toSorted((left, right) => right.localeCompare(left, 'en', { numeric: true }))[0]
  if (!selected) {
    return err(new Error(`No stable Next.js release matches ${version}. Nothing was installed.`))
  }
  return ok(selected)
}

/**
 * Read tag names without cloning a repository or changing the consumer workspace.
 * @param options - Repository and bounded advertised-ref pattern.
 * @returns Tag names or the Git process failure, without prompting for credentials.
 */
export async function readGitTags({
  repository,
  pattern,
}: {
  readonly repository: string
  readonly pattern: string
}): Promise<Result<readonly string[]>> {
  const result = await attemptAsync(() =>
    execute('git', ['ls-remote', '--tags', '--refs', '--', repository, pattern], {
      timeout: 120_000,
      maxBuffer: 4 * 1024 * 1024,
      env: { ...process.env, GIT_TERMINAL_PROMPT: '0' },
    })
  )
  if (isErr(result)) {
    return err(new Error(`Could not resolve Next.js releases: ${result.error.message}`))
  }
  return ok(
    result.value.stdout.split('\n').flatMap((line) => {
      const tag = /^[a-f0-9]{40}(?:[a-f0-9]{24})?\trefs\/tags\/(.+)$/.exec(line)?.[1]
      if (!tag) {
        return []
      }
      return [tag]
    })
  )
}
