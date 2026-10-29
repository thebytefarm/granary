import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { attemptAsync, err, isErr, ok } from 'massaman/control'
import type { Result } from 'massaman/control'

import { fromIo, sourceError } from '#/sources/errors.ts'
import type { SourceError } from '#/sources/errors.ts'
import type { OpenedSource, Source } from '#/sources/source.ts'
import { sourceReference } from '#/sources/source.ts'
import { exec } from '#/process/exec.ts'
import { createGitFiles } from '#/sources/git/files.ts'

/**
 * @private
 */
type GitSource = Extract<Source, { provider: 'git' }>

export type GitClient = { readonly withCheckout: typeof withCheckout }

/**
 * Own a disposable Git checkout's entire lifetime, including retrieval failures.
 */
export function createGitClient(): GitClient {
  return Object.freeze({ withCheckout })
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
  readonly use: (opened: OpenedSource) => Promise<Result<CONTENT, SourceError>>
}): Promise<Result<CONTENT, SourceError>> {
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
}): Promise<Result<OpenedSource, SourceError>> {
  const reference = await resolveReference({
    source,
    directory,
    ref: revision ?? sourceReference(source),
  })
  if (isErr(reference)) {
    return reference
  }
  const fetched = await fetchRevision({ source, directory, ref: reference.value })
  if (isErr(fetched)) {
    return fetched
  }
  const commit = await readGitCommit({ directory, ref: 'FETCH_HEAD' })
  if (isErr(commit)) {
    return commit
  }
  if (revision !== undefined && commit.value !== revision) {
    return err(sourceError({ kind: 'invalid', message: 'Git did not retrieve the locked commit.' }))
  }
  const files = await createGitFiles({ directory, commit: commit.value })
  if (isErr(files)) {
    return files
  }
  return ok({ directory, source, revision: commit.value, checkout: files.value })
}

/**
 * @private
 */
async function fetchRevision({
  source,
  directory,
  ref,
}: {
  readonly source: GitSource
  readonly directory: string
  readonly ref: string
}): Promise<Result<string, SourceError>> {
  const initialized = await runGit({ cwd: directory, args: ['init', '--quiet'] })
  if (isErr(initialized)) {
    return initialized
  }
  const remote = await runGit({
    cwd: directory,
    args: ['remote', 'add', 'origin', source.repository],
  })
  if (isErr(remote)) {
    return remote
  }
  return runGit({
    cwd: directory,
    args: ['fetch', '--quiet', '--depth=1', '--no-tags', '--filter=blob:none', '--', 'origin', ref],
  })
}

/**
 * @private
 */
async function createCheckoutDirectory(): Promise<Result<string, SourceError>> {
  return fromIo(await attemptAsync(() => mkdtemp(join(tmpdir(), 'granary-git-'))))
}

/**
 * @private
 */
async function removeCheckoutDirectory(directory: string): Promise<Result<void, SourceError>> {
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
  readonly opened: Result<OpenedSource, SourceError>
  readonly use: (opened: OpenedSource) => Promise<Result<CONTENT, SourceError>>
}): Promise<Result<CONTENT, SourceError>> {
  if (isErr(opened)) {
    return opened
  }
  const result = await attemptAsync(() => use(opened.value))
  if (isErr(result)) {
    return fromIo(result)
  }
  return result.value
}

/**
 * @private
 */
async function resolveReference({
  source,
  directory,
  ref,
}: {
  readonly source: GitSource
  readonly directory: string
  readonly ref: string
}): Promise<Result<string, SourceError>> {
  if (ref.startsWith('refs/') || ref === 'HEAD' || /^[a-f0-9]{40}(?:[a-f0-9]{24})?$/.test(ref)) {
    return ok(ref)
  }
  const advertised = await runGit({
    cwd: directory,
    args: ['ls-remote', '--refs', '--', source.repository, `refs/heads/${ref}`, `refs/tags/${ref}`],
  })
  if (isErr(advertised)) {
    return advertised
  }
  const references = advertised.value.split('\n').flatMap((line) => {
    const name = line.split('\t')[1]
    if (name === `refs/heads/${ref}` || name === `refs/tags/${ref}`) return [name]
    return []
  })
  if (references.length > 1) {
    return err(
      sourceError({
        kind: 'invalid',
        message: `Ambiguous Git revision ${ref}: select branch or tag explicitly.`,
      })
    )
  }
  const reference = references[0]
  if (!reference) {
    return err(sourceError({ kind: 'invalid', message: `Git revision is unavailable: ${ref}.` }))
  }
  return ok(reference)
}

/**
 * @private
 */
async function readGitCommit({
  directory,
  ref,
}: {
  readonly directory: string
  readonly ref: string
}): Promise<Result<string, SourceError>> {
  const found = await runGit({
    cwd: directory,
    args: ['rev-parse', '--verify', '--end-of-options', `${ref}^{commit}`],
  })
  if (isErr(found)) {
    return found
  }
  if (!/^[a-f0-9]{40}(?:[a-f0-9]{24})?$/.test(found.value)) {
    return err(sourceError({ kind: 'invalid', message: 'Git did not identify a commit.' }))
  }
  return ok(found.value)
}

/**
 * @private
 */
async function runGit({
  cwd,
  args,
}: {
  readonly cwd: string
  readonly args: readonly string[]
}): Promise<Result<string, SourceError>> {
  const result = await exec({
    executable: 'git',
    args,
    cwd,
    timeout: 120_000,
    maxBuffer: 1024 * 1024,
    env: { ...process.env, GIT_TERMINAL_PROMPT: '0' },
  })
  if (isErr(result)) {
    return result
  }
  return ok(result.value.stdout.trim())
}
