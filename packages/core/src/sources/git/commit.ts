import { err, isErr, ok } from 'massaman/control'
import type { Result } from 'massaman/control'

import { installationError } from '../../errors.js'
import type { InstallationError } from '../../errors.js'
import { runGit } from './process.js'

/**
 * Find the exact commit identified by a ref, rejecting option-like or invalid results.
 */
export async function findGitCommit({
  directory,
  ref,
}: {
  readonly directory: string
  readonly ref: string
}): Promise<Result<string, InstallationError>> {
  const direct = await readGitCommit({ directory, ref })
  if (!isErr(direct)) {
    return direct
  }
  const branch = ref.replace(/^refs\/heads\//, '')
  return readGitCommit({ directory, ref: `refs/remotes/origin/${branch}` })
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
}): Promise<Result<string, InstallationError>> {
  const found = await runGit([
    '-C',
    directory,
    'rev-parse',
    '--verify',
    '--end-of-options',
    `${ref}^{commit}`,
  ])
  if (isErr(found)) {
    return found
  }
  if (!/^[a-f0-9]{40}(?:[a-f0-9]{24})?$/.test(found.value)) {
    return err(installationError({ kind: 'invalid', message: 'Git did not identify a commit.' }))
  }
  return ok(found.value)
}
