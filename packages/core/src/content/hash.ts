import { createHash } from 'node:crypto'

/**
 * Hash exact bytes independently of file metadata and operating system.
 */
export function hashContent(content: Buffer | string): string {
  return createHash('sha256').update(content).digest('hex')
}
