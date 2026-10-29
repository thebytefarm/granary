import { mkdtemp, realpath, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { isErr, unwrap } from 'massaman/control'
import { describe, expect, it, onTestFinished } from 'vitest'

import { exec } from '#/process/exec.ts'

describe('bounded process execution', () => {
  it('preserves arguments literally and uses the explicit directory and environment', async () => {
    const cwd = await workspace()
    const literal = '$(echo not-a-shell); * "quoted"'
    const result = unwrap(
      await exec({
        executable: process.execPath,
        args: [
          '-e',
          'process.stdout.write(JSON.stringify({cwd: process.cwd(), arg: process.argv[1], env: process.env.GRANARY_EXEC_TEST})); process.stderr.write("diagnostic")',
          literal,
        ],
        cwd,
        env: { GRANARY_EXEC_TEST: 'isolated' },
      })
    )
    expect(JSON.parse(result.stdout)).toEqual({
      cwd: await realpath(cwd),
      arg: literal,
      env: 'isolated',
    })
    expect(result.stderr).toBe('diagnostic')
  })

  it('returns a classified failure with the underlying exit code', async () => {
    const result = await exec({
      executable: process.execPath,
      args: ['-e', 'process.exit(7)'],
      cwd: await workspace(),
    })
    expect(isErr(result)).toBe(true)
    if (isErr(result)) {
      expect(result.error.kind).toBe('io')
      expect(result.error.cause).toMatchObject({ code: 7 })
    }
  })

  it('terminates commands that exceed their deadline', async () => {
    const result = await exec({
      executable: process.execPath,
      args: ['-e', 'setInterval(() => {}, 1000)'],
      cwd: await workspace(),
      timeout: 50,
    })
    expect(isErr(result)).toBe(true)
    if (isErr(result)) {
      expect(result.error.cause).toMatchObject({ killed: true })
    }
  })

  it('bounds captured output', async () => {
    const result = await exec({
      executable: process.execPath,
      args: ['-e', 'process.stdout.write("x".repeat(8192))'],
      cwd: await workspace(),
      maxBuffer: 128,
    })
    expect(isErr(result)).toBe(true)
    if (isErr(result)) {
      expect(result.error.cause).toMatchObject({ code: 'ERR_CHILD_PROCESS_STDIO_MAXBUFFER' })
    }
  })
})

async function workspace(): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), 'granary-exec-'))
  onTestFinished(() => rm(directory, { recursive: true, force: true }))
  return directory
}
