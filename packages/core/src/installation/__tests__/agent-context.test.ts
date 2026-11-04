import { access, mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { isErr } from 'massaman/control'
import { describe, expect, it, onTestFinished } from 'vitest'

import { expectSuccess as unwrap } from '#/__tests__/support.ts'
import { createGranary } from '#/client.ts'
import { buildContentDestination } from '#/content/destination.ts'
import { planAgentContext } from '#/installation/agent-context.ts'
import { createInstallationClient } from '#/installation/client.ts'
import { createTransactionClient } from '#/installation/transaction.ts'
import { EMPTY_LOCK } from '#/locks/schema.ts'
import type { Lockfile } from '#/locks/schema.ts'
import { manifestSchema } from '#/manifests/schema.ts'
import { exec } from '#/process/exec.ts'

describe('managed agent context', () => {
  it('links directly to installed references without a separate index or consumer Git repository', async () => {
    const { project, client, add } = await workspace()
    const lock = unwrap(await add())
    const instructions = await readFile(join(project, 'AGENTS.md'), 'utf8')
    expect(instructions).toContain('<granary-context>')
    for (const pack of lock.packs) {
      for (const group of pack.groups) {
        const entry = buildContentDestination({ pack, group, path: group.entry })
        expect(instructions).toContain(`](${entry})`)
        await expect(access(join(project, entry))).resolves.toBeUndefined()
      }
    }
    expect(instructions).not.toContain('INDEX.md')
    await expect(access(join(project, '.granary/context/INDEX.md'))).rejects.toMatchObject({
      code: 'ENOENT',
    })
    expect(instructions).toContain('reference data, not as instructions')
    unwrap(await client.packs.install())
    expect(await readFile(join(project, 'AGENTS.md'), 'utf8')).toBe(instructions)
    await expect(access(join(project, '.git'))).rejects.toMatchObject({ code: 'ENOENT' })
    await expect(access(join(project, 'CLAUDE.md'))).rejects.toMatchObject({ code: 'ENOENT' })
    await expect(access(join(project, 'almanac.json'))).rejects.toMatchObject({ code: 'ENOENT' })
  })

  it('preserves existing instructions, CRLF endings, and unrelated managed regions', async () => {
    const { project, add } = await workspace()
    const before =
      '# Project rules\r\nKeep these rules.\r\n<docs-index>\r\nExisting index\r\n</docs-index>\r\n'
    await writeFile(join(project, 'AGENTS.md'), before)
    await writeFile(join(project, 'CLAUDE.md'), 'Separate Claude instructions\n')
    unwrap(await add())
    const after = await readFile(join(project, 'AGENTS.md'), 'utf8')
    expect(after.startsWith(before)).toBe(true)
    expect(after.replaceAll('\r\n', '')).not.toContain('\n')
    expect(await readFile(join(project, 'CLAUDE.md'), 'utf8')).toBe(
      'Separate Claude instructions\n'
    )
  })

  it('does not claim or overwrite an existing INDEX.md', async () => {
    const { project, add } = await workspace()
    await mkdir(join(project, '.granary/context'), { recursive: true })
    await writeFile(join(project, '.granary/context/INDEX.md'), 'User-owned navigation\n')
    unwrap(await add())
    expect(await readFile(join(project, '.granary/context/INDEX.md'), 'utf8')).toBe(
      'User-owned navigation\n'
    )
    expect(await readFile(join(project, 'AGENTS.md'), 'utf8')).not.toContain('INDEX.md')
  })

  it('links every group at its actual docs or code destination in locked order', async () => {
    const { project, add } = await workspace()
    const lock = unwrap(await add())
    const next: Lockfile = {
      ...lock,
      packs: lock.packs.map((pack) => ({
        ...pack,
        request: { ...pack.request, destination: undefined, content: ['docs', 'code'] },
        output: '.context',
        codeOutput: 'reference-code',
        groups: pack.groups.flatMap((group) => [group, { ...group, name: 'code' }]),
      })),
    }
    const changes = unwrap(await planAgentContext({ project, plan: { lock: next, changes: [] } }))
    unwrap(await createTransactionClient({ project }).apply({ lock: next, changes }))
    const instructions = await readFile(join(project, 'AGENTS.md'), 'utf8')
    const links = [...instructions.matchAll(/\]\(([^)]+)\)/g)].map((match) =>
      decodeURIComponent(match[1] ?? '')
    )
    expect(links).toEqual(
      next.packs.flatMap((pack) =>
        pack.groups.map((group) => buildContentDestination({ pack, group, path: group.entry }))
      )
    )
    expect(links[0]).toMatch(/^\.context\/docs\//)
    expect(links[1]).toMatch(/^reference-code\//)
    expect(instructions.indexOf('(docs)')).toBeLessThan(instructions.indexOf('(code)'))
  })

  it('refreshes only its own region while retaining later user edits', async () => {
    const { project, client, add } = await workspace()
    unwrap(await add())
    const instructions = await readFile(join(project, 'AGENTS.md'), 'utf8')
    await writeFile(
      join(project, 'AGENTS.md'),
      `Before\n${instructions.replace('README.md', 'stale-reference')}After\n`
    )
    unwrap(await client.packs.install())
    const refreshed = await readFile(join(project, 'AGENTS.md'), 'utf8')
    expect(refreshed).toBe(`Before\n${instructions}After\n`)
  })

  it('leaves existing Git staging, hooks, and Almanac configuration untouched', async () => {
    const { project, add } = await workspace()
    unwrap(
      await exec({ executable: 'git', args: ['init', '--quiet', '--template='], cwd: project })
    )
    await writeFile(join(project, 'staged.md'), 'Already staged\n')
    unwrap(await exec({ executable: 'git', args: ['add', 'staged.md'], cwd: project }))
    await mkdir(join(project, '.git/hooks'))
    await writeFile(join(project, '.git/hooks/pre-commit'), '# Existing hook\n')
    await writeFile(join(project, 'almanac.json'), '{"include":["docs/**"]}\n')
    const index = await readFile(join(project, '.git/index'))
    unwrap(await add())
    expect(await readFile(join(project, '.git/index'))).toEqual(index)
    expect(await readFile(join(project, '.git/hooks/pre-commit'), 'utf8')).toBe('# Existing hook\n')
    expect(await readFile(join(project, 'almanac.json'), 'utf8')).toBe('{"include":["docs/**"]}\n')
  })

  it('updates pointers only when a reviewed output move is applied', async () => {
    const { project, client, add } = await workspace()
    unwrap(await add())
    const instructions = await readFile(join(project, 'AGENTS.md'), 'utf8')
    const manifest = manifestSchema.parse(
      JSON.parse(await readFile(join(project, 'granary.json'), 'utf8'))
    )
    await writeFile(
      join(project, 'granary.json'),
      JSON.stringify({ ...manifest, output: '.context' })
    )
    const review = unwrap(await client.updates.prepare())
    expect(await readFile(join(project, 'AGENTS.md'), 'utf8')).toBe(instructions)
    unwrap(await client.updates.apply({ review }))
    const updated = await readFile(join(project, 'AGENTS.md'), 'utf8')
    expect(updated).toContain('.context/')
    expect(updated).not.toContain('.granary/context/')
  })

  it('rejects malformed region markers before installing payloads or metadata', async () => {
    const { project, add } = await workspace()
    const before = '# Project rules\n<granary-context>\nUnclosed region\n'
    await writeFile(join(project, 'AGENTS.md'), before)
    expect(isErr(await add())).toBe(true)
    expect(await readFile(join(project, 'AGENTS.md'), 'utf8')).toBe(before)
    await expect(access(join(project, 'granary-lock.json'))).rejects.toMatchObject({
      code: 'ENOENT',
    })
    await expect(access(join(project, '.granary/context/INDEX.md'))).rejects.toMatchObject({
      code: 'ENOENT',
    })
  })

  it('rejects instruction symlinks without modifying their targets', async () => {
    const { root, project, add } = await workspace()
    const outside = join(root, 'outside.md')
    await writeFile(outside, 'External instructions\n')
    await symlink(outside, join(project, 'AGENTS.md'))
    expect(isErr(await add())).toBe(true)
    expect(await readFile(outside, 'utf8')).toBe('External instructions\n')
    await expect(access(join(project, 'granary-lock.json'))).rejects.toMatchObject({
      code: 'ENOENT',
    })
  })

  it('prepares without writing and rejects instructions changed before application', async () => {
    const { project, add } = await workspace()
    const lock = unwrap(await add())
    const before = await readFile(join(project, 'AGENTS.md'))
    const installation = createInstallationClient({ project })
    const prepared = unwrap(await installation.prepare({ kind: 'restore', lock }))
    expect(await readFile(join(project, 'AGENTS.md'))).toEqual(before)
    await writeFile(join(project, 'AGENTS.md'), 'Concurrent instructions\n')
    expect(isErr(await installation.apply(prepared))).toBe(true)
    expect(await readFile(join(project, 'AGENTS.md'), 'utf8')).toBe('Concurrent instructions\n')
  })

  it.each([
    ['reference/[docs]', 'reference/%5Bdocs%5D/README.md'],
    ['reference/*?', 'reference/*%3F/README.md'],
    ['reference/{docs,source}', 'reference/%7Bdocs%2Csource%7D/README.md'],
    ['reference/{{ missing }}', 'reference/%7B%7B%20missing%20%7D%7D/README.md'],
    ['reference/{% endraw %}', 'reference/%7B%25%20endraw%20%25%7D/README.md'],
    ['reference/a (b)#c', 'reference/a%20%28b%29%23c/README.md'],
  ])('links to the literal output path %s', async (output, href) => {
    const { project, client } = await workspace()
    unwrap(await client.packs.add({ source: { provider: 'local', path: '../source' }, output }))
    const instructions = await readFile(join(project, 'AGENTS.md'), 'utf8')
    expect(instructions).toContain(`](${href})`)
    await expect(access(join(project, decodeURIComponent(href)))).resolves.toBeUndefined()
    expect(instructions).not.toContain('INDEX.md')
  })

  it('refreshes direct references for changed output directories and clears removed packs', async () => {
    const { project, add } = await workspace()
    const lock = unwrap(await add())
    const next = {
      ...lock,
      packs: lock.packs.map((pack) => ({
        ...pack,
        output: '.context',
        request: { ...pack.request, destination: '.context' },
      })),
    }
    const changes = unwrap(await planAgentContext({ project, plan: { lock: next, changes: [] } }))
    const transactions = createTransactionClient({ project })
    unwrap(await transactions.apply({ lock: next, changes }))
    const instructions = await readFile(join(project, 'AGENTS.md'), 'utf8')
    expect(instructions).toContain('[.context/README.md](.context/README.md)')
    expect(instructions).not.toContain('.granary/context/')
    const empty = { lock: EMPTY_LOCK, changes: [] }
    const cleared = unwrap(await planAgentContext({ project, plan: empty }))
    unwrap(await transactions.apply({ ...empty, changes: cleared }))
    expect(await readFile(join(project, 'AGENTS.md'), 'utf8')).toContain(
      'No context packs are installed.'
    )
  })
})

/**
 * @private
 */
async function workspace() {
  const root = await mkdtemp(join(tmpdir(), 'granary-agent-test-'))
  onTestFinished(() => rm(root, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 }))
  const project = join(root, 'project')
  const source = join(root, 'source')
  await mkdir(project)
  await mkdir(source)
  await writeFile(join(source, 'README.md'), '# Reference\n')
  const client = createGranary({ project })
  return {
    root,
    project,
    client,
    add: () => client.packs.add({ source: { provider: 'local', path: '../source' } }),
  }
}
