import { attempt, err, isErr, ok } from 'massaman/control'
import type { Result } from 'massaman/control'
import type { z } from 'zod'

import { installationError } from '../errors.js'
import type { InstallationError } from '../errors.js'
import { readBytes } from './file.js'

/**
 * Read JSON and validate unknown input before returning domain data.
 */
export async function readJson<CONTENT>({
  path,
  schema,
}: {
  readonly path: string
  readonly schema: z.ZodType<CONTENT>
}): Promise<Result<CONTENT, InstallationError>> {
  const bytes = await readBytes(path)
  if (isErr(bytes)) {
    return bytes
  }
  return parseJson({ bytes: bytes.value, path, schema })
}

/**
 * Validate a JSON buffer without rereading a mutable source file.
 */
export function parseJson<CONTENT>({
  bytes,
  path,
  schema,
}: {
  readonly bytes: Buffer
  readonly path: string
  readonly schema: z.ZodType<CONTENT>
}): Result<CONTENT, InstallationError> {
  const parsed = attempt((): unknown => JSON.parse(bytes.toString('utf8')))
  if (isErr(parsed)) {
    return err(
      installationError({ kind: 'invalid', message: `Invalid JSON: ${path}`, cause: parsed.error })
    )
  }
  const validated = schema.safeParse(parsed.value)
  if (!validated.success) {
    return err(
      installationError({
        kind: 'invalid',
        message: `Invalid metadata: ${path}: ${validated.error.message}`,
      })
    )
  }
  return ok(validated.data)
}

/**
 * Serialize canonical consumer metadata with a terminating newline.
 */
export function formatJson(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`
}
