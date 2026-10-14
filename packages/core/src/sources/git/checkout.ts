import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { attemptAsync, isErr, ok } from 'massaman/control'
import type { Result } from 'massaman/control'

import { fromIo } from '../../errors.js'
import type { InstallationError } from '../../errors.js'
import type { OpenedSource, Source } from '../source.js'
import { findGitCommit } from './commit.js'
import { runGit } from './process.js'

/**
 * @private
 */
type GitSource = Extract<Source, { kind: 'git' }>

export type GitSourceReader = { readonly withCheckout: typeof withCheckout }

/**
 * Own a disposable Git checkout's entire lifetime, including retrieval failures.
 */
export function createGitSource(): GitSourceReader {
  return { withCheckout }
}

/**
 * @private
 */
async function withCheckout<CONTENT>({
  source,
  revision,
  use,
}: {
  readonly source: GitSource
  readonly revision?: string | undefined
  readonly use: (opened: OpenedSource) => Promise<Result<CONTENT, InstallationError>>
}): Promise<Result<CONTENT, InstallationError>> {
  const temporary = await createCheckoutDirectory()
  if (isErr(temporary)) {
    return temporary
  }
  const opened = await openCheckout({ source, directory: temporary.value, revision })
  const result = await readCheckout({ opened, use })
  const cleanup = await removeCheckoutDirectory(temporary.value)
  if (isErr(cleanup)) {
    return cleanup
  }
  return result
}

/**
 * @private
 */
async function openCheckout({
  source,
  directory,
  revision,
}: {
  readonly source: GitSource
  readonly directory: string
  readonly revision?: string | undefined
}): Promise<Result<OpenedSource, InstallationError>> {
  const cloned = await cloneRepository({ source, directory })
  if (isErr(cloned)) {
    return cloned
  }
  const commit = await findGitCommit({ directory, ref: revision ?? source.ref })
  if (isErr(commit)) {
    return commit
  }
  const checked = await checkoutCommit({ directory, commit: commit.value })
  if (isErr(checked)) {
    return checked
  }
  return ok({ directory, source, revision: commit.value })
}

/**
 * @private
 */
async function cloneRepository({
  source,
  directory,
}: {
  readonly source: GitSource
  readonly directory: string
}): Promise<Result<string, InstallationError>> {
  return runGit(['clone', '--quiet', '--no-checkout', '--', source.repository, directory])
}

/**
 * @private
 */
async function checkoutCommit({
  directory,
  commit,
}: {
  readonly directory: string
  readonly commit: string
}): Promise<Result<string, InstallationError>> {
  return runGit([
    '-C',
    directory,
    '-c',
    'core.hooksPath=/dev/null',
    'checkout',
    '--quiet',
    '--detach',
    commit,
    '--',
  ])
}

/**
 * @private
 */
async function createCheckoutDirectory(): Promise<Result<string, InstallationError>> {
  return fromIo(await attemptAsync(() => mkdtemp(join(tmpdir(), 'granary-git-'))))
}

/**
 * @private
 */
async function removeCheckoutDirectory(
  directory: string
): Promise<Result<void, InstallationError>> {
  return fromIo(
    await attemptAsync(() =>
      rm(directory, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 })
    )
  )
}

/**
 * @private
 */
async function readCheckout<CONTENT>({
  opened,
  use,
}: {
  readonly opened: Result<OpenedSource, InstallationError>
  readonly use: (opened: OpenedSource) => Promise<Result<CONTENT, InstallationError>>
}): Promise<Result<CONTENT, InstallationError>> {
  if (isErr(opened)) {
    return opened
  }
  const result = await attemptAsync(() => use(opened.value))
  if (isErr(result)) {
    return fromIo(result)
  }
  return result.value
}
