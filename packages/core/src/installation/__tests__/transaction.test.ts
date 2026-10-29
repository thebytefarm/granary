import { access, chmod, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { isErr, unwrap } from 'massaman/control'
import { describe, expect, it, onTestFinished } from 'vitest'

import { createFilesystemClient } from '#/filesystem.ts'
import { EMPTY_LOCK } from '#/locks/schema.ts'
import { hashContent } from '#/content/hash.ts'
import { createTransactionClient } from '#/installation/transaction.ts'

describe('installation transaction', () => {
  it.each([
    [
      { path: 'same.md', content: 'One' },
      { path: 'same.md', content: 'Two' },
    ],
    [
      { path: 'parent', content: 'One' },
      { path: 'parent/child.md', content: 'Two' },
    ],
    [
      { path: 'same.md', content: 'One' },
      { path: './same.md', content: 'Two' },
    ],
  ])('rejects overlapping destinations before writing any bytes', async (...changes) => {
    const project = await createProject()
    const result = await createTransactionClient({ project }).apply({ lock: EMPTY_LOCK, changes })
    expect(isErr(result) && result.error.kind).toBe('conflict')
    await expect(access(join(project, 'same.md'))).rejects.toMatchObject({ code: 'ENOENT' })
    await expect(access(join(project, 'parent'))).rejects.toMatchObject({ code: 'ENOENT' })
  })

  it('rejects a non-directory ancestor without replacing its contents', async () => {
    const project = await createProject()
    await writeFile(join(project, 'blocked'), 'Keep this file')
    const result = await createTransactionClient({ project }).apply({
      lock: EMPTY_LOCK,
      changes: [
        { path: 'new.md', content: 'New' },
        { path: 'blocked/child.md', content: 'Invalid' },
      ],
    })
    expect(isErr(result)).toBe(true)
    expect(await readFile(join(project, 'blocked'), 'utf8')).toBe('Keep this file')
    await expect(access(join(project, 'new.md'))).rejects.toMatchObject({ code: 'ENOENT' })
  })

  it('restores earlier bytes and removes newly written files after a later write fails', async () => {
    const project = await createProject()
    const blocked = join(project, 'blocked')
    await writeFile(join(project, 'existing.md'), 'Original notes')
    await writeFile(join(project, 'deleted.md'), 'Keep deleted notes')
    await mkdir(blocked)
    await chmod(blocked, 0o555)
    onTestFinished(() => chmod(blocked, 0o755))

    const result = await createTransactionClient({ project }).apply({
      lock: EMPTY_LOCK,
      changes: [
        { path: 'existing.md', content: 'Replacement', expected: hashContent('Original notes') },
        {
          path: 'deleted.md',
          content: null,
          expected: hashContent('Keep deleted notes'),
          expectedMissing: false,
        },
        { path: 'new.md', content: 'New reference' },
        { path: 'blocked/file.md', content: 'Cannot write here' },
      ],
    })

    expect(isErr(result) && result.error.kind).toBe('io')
    expect(await readFile(join(project, 'existing.md'), 'utf8')).toBe('Original notes')
    expect(await readFile(join(project, 'deleted.md'), 'utf8')).toBe('Keep deleted notes')
    await expect(access(join(project, 'new.md'))).rejects.toMatchObject({ code: 'ENOENT' })
    await expect(access(join(blocked, 'file.md'))).rejects.toMatchObject({ code: 'ENOENT' })
  })

  it('rejects a file created after preflight without overwriting its bytes', async () => {
    const project = await createProject()
    const prepared = unwrap(
      await createTransactionClient({ project }).prepare({
        lock: EMPTY_LOCK,
        changes: [{ path: 'notes.md', content: 'Planned' }],
      })
    )
    await writeFile(join(project, 'notes.md'), 'Concurrent notes')
    expect(isErr(await prepared.apply())).toBe(true)
    expect(await readFile(join(project, 'notes.md'), 'utf8')).toBe('Concurrent notes')
  })

  it('detects changes to replaceable metadata after preflight', async () => {
    const project = await createProject()
    await writeFile(join(project, 'granary.json'), 'Original config')
    const prepared = unwrap(
      await createTransactionClient({ project }).prepare({
        lock: EMPTY_LOCK,
        changes: [{ path: 'granary.json', content: 'Planned config', replace: true }],
      })
    )
    await writeFile(join(project, 'granary.json'), 'Updated config')
    expect(isErr(await prepared.apply())).toBe(true)
    expect(await readFile(join(project, 'granary.json'), 'utf8')).toBe('Updated config')
  })

  it('preserves distinct case-sensitive paths and rolls back aliasing paths on insensitive volumes', async () => {
    const project = await createProject()
    await writeFile(join(project, 'Probe.md'), 'Probe')
    const aliases = unwrap(
      await createFilesystemClient({ root: project }).exists({ path: 'probe.md' })
    )
    const result = await createTransactionClient({ project }).apply({
      lock: EMPTY_LOCK,
      changes: [
        { path: 'Reference.md', content: 'Uppercase reference' },
        { path: 'reference.md', content: 'Lowercase reference' },
      ],
    })
    if (aliases) {
      expect(isErr(result) && result.error.kind).toBe('conflict')
      await expect(access(join(project, 'Reference.md'))).rejects.toMatchObject({ code: 'ENOENT' })
      return
    }
    expect(isErr(result)).toBe(false)
    expect(await readFile(join(project, 'Reference.md'), 'utf8')).toBe('Uppercase reference')
    expect(await readFile(join(project, 'reference.md'), 'utf8')).toBe('Lowercase reference')
  })
})

async function createProject(): Promise<string> {
  const project = await mkdtemp(join(tmpdir(), 'granary-transaction-'))
  onTestFinished(() =>
    rm(project, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 })
  )
  return project
}
