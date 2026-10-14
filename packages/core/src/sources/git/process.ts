import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

import { attemptAsync } from 'massaman/control'
import type { Result } from 'massaman/control'

import { fromIo } from '../../errors.js'
import type { InstallationError } from '../../errors.js'

const execute = promisify(execFile)

/**
 * Run Git without a shell, interactive credentials, or unbounded execution.
 */
export async function runGit(args: readonly string[]): Promise<Result<string, InstallationError>> {
  return fromIo(
    await attemptAsync(async () => {
      const result = await execute('git', [...args], {
        timeout: 120_000,
        maxBuffer: 1024 * 1024,
        env: { ...process.env, GIT_TERMINAL_PROMPT: '0' },
      })
      return result.stdout.trim()
    })
  )
}
