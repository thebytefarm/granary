import { execFile, spawnSync } from 'node:child_process'
import { cp, mkdir, mkdtemp, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'

import { describe, expect, it, onTestFinished } from 'vitest'

const execute = promisify(execFile)
const script = fileURLToPath(new URL('../../../../publish.sh', import.meta.url))

describe('local publishing safeguards', () => {
  it('accepts help and rejects unknown actions without preparing or publishing', async () => {
    const help = await execute('bash', [script, '--help'])
    expect(help.stdout).toContain('This script never commits or pushes.')
    await expect(execute('bash', [script, 'unknown'])).rejects.toMatchObject({ code: 1 })
    await expect(execute('bash', [script, 'prepare', 'extra'])).rejects.toMatchObject({ code: 1 })
  })

  it('refuses to prepare versions from a dirty checkout', async () => {
    const project = await repository()
    await writeFile(join(project, 'uncommitted.md'), 'Uncommitted work\n')
    await expect(execute('bash', [join(project, 'publish.sh'), 'prepare'])).rejects.toMatchObject({
      code: 1,
      stderr: expect.stringContaining('Commit your changes'),
    })
  })

  it('refuses version preparation when no changesets remain', async () => {
    const project = await repository()
    await expect(execute('bash', [join(project, 'publish.sh'), 'prepare'])).rejects.toMatchObject({
      code: 1,
      stderr: expect.stringContaining('No pending changesets'),
    })
  })

  it('refuses publication before pending changesets are consumed', async () => {
    const project = await repository({ pending: true })
    await expect(execute('bash', [join(project, 'publish.sh')])).rejects.toMatchObject({
      code: 1,
      stderr: expect.stringContaining('Run ./publish.sh prepare'),
    })
  })

  it('allows cancellation before checking npm authentication or running release commands', async () => {
    const project = await repository()
    const result = spawnSync('bash', [join(project, 'publish.sh')], {
      input: 'cancel\n',
      encoding: 'utf8',
      timeout: 10_000,
    })
    expect(result.status).toBe(0)
    expect(result.stdout).toContain('granary-ai@0.0.2')
    expect(result.stdout).toContain('Cancelled. Nothing published.')
  })
})

async function repository({
  pending = false,
}: { readonly pending?: boolean } = {}): Promise<string> {
  const project = await mkdtemp(join(tmpdir(), 'granary-local-publish-'))
  onTestFinished(() => rm(project, { recursive: true, force: true }))
  await cp(script, join(project, 'publish.sh'))
  await mkdir(join(project, '.changeset'))
  await writeFile(join(project, '.changeset/README.md'), '# Changesets\n')
  await mkdir(join(project, 'packages/granary'), { recursive: true })
  await writeFile(
    join(project, 'packages/granary/package.json'),
    JSON.stringify({
      name: 'granary-ai',
      version: '0.0.2',
    })
  )
  if (pending) {
    await writeFile(
      join(project, '.changeset/release.md'),
      "---\n'granary-ai': patch\n---\n\nFix.\n"
    )
  }
  await execute('git', ['-C', project, 'init', '--quiet', '-b', 'main'])
  await execute('git', ['-C', project, 'add', '.'])
  const tree = await execute('git', ['-C', project, 'write-tree'])
  const commit = await execute(
    'git',
    ['-C', project, 'commit-tree', tree.stdout.trim(), '-m', 'Fixture'],
    {
      env: {
        ...process.env,
        GIT_AUTHOR_NAME: 'Test',
        GIT_AUTHOR_EMAIL: 'test@example.com',
        GIT_COMMITTER_NAME: 'Test',
        GIT_COMMITTER_EMAIL: 'test@example.com',
      },
    }
  )
  await execute('git', ['-C', project, 'update-ref', 'refs/heads/main', commit.stdout.trim()])
  return project
}
