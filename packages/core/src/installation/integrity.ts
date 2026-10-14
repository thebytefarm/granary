import { createHash } from 'node:crypto'

import { err, ok } from 'massaman/control'
import type { Result } from 'massaman/control'

import { installationError } from '../errors.js'
import type { InstallationError } from '../errors.js'

/**
 * Hash exact bytes independently of file metadata and operating system.
 */
export function hashContent(content: Buffer | string): string {
  return createHash('sha256').update(content).digest('hex')
}

/**
 * Reject bytes that no longer match their recorded source integrity.
 */
export function checkContentHash({
  content,
  hash,
  name,
}: {
  readonly content: Buffer
  readonly hash: string
  readonly name: string
}): Result<void, InstallationError> {
  if (hashContent(content) !== hash) {
    return err(
      installationError({
        kind: 'drift',
        message: `Locked source changed for ${name}; restore the original source before installing.`,
      })
    )
  }
  return ok(undefined)
}
