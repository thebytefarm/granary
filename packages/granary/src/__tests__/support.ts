import { execFile } from 'node:child_process'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'

import { onTestFinished } from 'vitest'

const execute = promisify(execFile)
const repository = fileURLToPath(new URL('../../../../', import.meta.url))

/**
 * Install the packed distribution in an isolated consumer; pnpm uses its offline cache.
 * @private
 */
export async function installedCli({
  packageManager = 'pnpm',
}: { readonly packageManager?: 'npm' | 'pnpm' } = {}): Promise<{
  readonly project: string
  readonly run: (
    args: readonly string[]
  ) => Promise<{ readonly stdout: string; readonly stderr: string }>
}> {
  const directory = await temporaryDirectory()
  const project = join(directory, 'consumer')
  const tarball = join(directory, 'granary-ai.tgz')
  await mkdir(project)
  await execute('pnpm', ['--filter', 'granary-ai', 'pack', '--out', tarball], {
    cwd: repository,
    timeout: 60_000,
  })
  await writeFile(
    join(project, 'package.json'),
    JSON.stringify({
      name: 'granary-consumer-smoke',
      private: true,
      type: 'module',
      dependencies: { 'granary-ai': `file:${tarball}` },
    })
  )
  await execute(packageManager, installArguments(packageManager), {
    cwd: project,
    timeout: 120_000,
    maxBuffer: 4 * 1024 * 1024,
  })
  return {
    project,
    async run(args) {
      return execute(join(project, 'node_modules/.bin/granary'), [...args], {
        cwd: project,
        timeout: 240_000,
        maxBuffer: 4 * 1024 * 1024,
        env: { ...process.env, NO_COLOR: '1', GIT_TERMINAL_PROMPT: '0' },
      }).catch((error: unknown) => {
        if (error instanceof Error && 'stdout' in error && 'stderr' in error) {
          console.error(
            `granary ${args.join(' ')} failed:\n${String(error.stdout)}${String(error.stderr)}`
          )
        }
        return Promise.reject(error)
      })
    },
  }
}

/**
 * @private
 */
function installArguments(packageManager: 'npm' | 'pnpm'): readonly string[] {
  if (packageManager === 'npm') return ['install', '--no-audit', '--no-fund']
  return ['install', '--offline']
}

/**
 * @private
 */
export async function temporaryDirectory(): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), 'granary-distribution-'))
  onTestFinished(() => rm(directory, { recursive: true, force: true }))
  return directory
}
