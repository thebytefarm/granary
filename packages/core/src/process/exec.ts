import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

import { attemptAsync, err, isErr, ok } from 'massaman/control'
import type { Result } from 'massaman/control'

export type ExecOptions = {
  readonly executable: string
  readonly args: readonly string[]
  readonly cwd: string
  readonly timeout?: number | undefined
  readonly maxBuffer?: number | undefined
  readonly env?: Readonly<NodeJS.ProcessEnv> | undefined
}
export type ExecResult = { readonly stdout: string; readonly stderr: string }
export type ExecError = Error & { readonly kind: 'io' }
const executeFile = promisify(execFile)

/**
 * Execute an argument vector without a shell and contain process failures as values.
 * @param options - Executable, arguments, directory, and optional bounds; defaults to 60s and 8 MiB.
 * @returns Captured output or a typed failure retaining the original process error.
 */
export async function exec({
  executable,
  args,
  cwd,
  timeout = 60_000,
  maxBuffer = 8 * 1024 * 1024,
  env,
}: ExecOptions): Promise<Result<ExecResult, ExecError>> {
  const result = await attemptAsync(() =>
    executeFile(executable, [...args], { cwd, timeout, maxBuffer, env, encoding: 'utf8' })
  )
  if (isErr(result)) {
    return err(
      Object.assign(
        new Error(`Unable to execute ${executable}: ${result.error.message}`, {
          cause: result.error,
        }),
        { kind: 'io' as const }
      )
    )
  }
  return ok({ stdout: result.value.stdout, stderr: result.value.stderr })
}
