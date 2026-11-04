import { createHash } from 'node:crypto'
import { readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { join, relative } from 'node:path'

import { describe, expect, it } from 'vitest'

import { installedCli, temporaryDirectory } from './support.ts'

const page = 'docs/01-app/01-getting-started/01-installation.mdx'

describe('live Next.js context installation', () => {
  it('adds Next.js 16 docs through shorthand and reproduces every file in a fresh consumer', async () => {
    const { project, run } = await installedCli({ packageManager: 'npm' })
    const installed = await run(['add', 'nextjs@16'])
    const tag = /github:vercel\/next\.js@(v16\.[0-9]+\.[0-9]+) /.exec(installed.stdout)?.[1] ?? ''
    expect(tag).toMatch(/^v16\.[0-9]+\.[0-9]+$/)
    const config = await readFile(join(project, 'granary.json'), 'utf8')
    expect(JSON.parse(config)).toMatchObject({
      packs: { 'github:vercel/next.js': { tag, files: { include: ['docs/**'] } } },
    })
    const destination = `.granary/context/github/vercel/next.js/${tag}`
    const directory = join(project, destination)
    expect(await readdir(directory)).toEqual(['docs'])
    expect(await readFile(join(directory, page), 'utf8')).toContain('title: Installation')
    expect(await readFile(join(project, 'AGENTS.md'), 'utf8')).toContain(tag)
    const lock = await readFile(join(project, 'granary-lock.json'), 'utf8')
    expect(JSON.parse(lock)).toMatchObject({
      packs: [{ definition: { revision: expect.stringMatching(/^[a-f0-9]{40}$/) } }],
    })
    const fresh = await temporaryDirectory()
    await writeFile(join(fresh, 'granary.json'), config)
    await writeFile(join(fresh, 'granary-lock.json'), lock)
    await run(['install', '--cwd', fresh])
    const entries = await readdir(directory, { recursive: true, withFileTypes: true })
    const files = entries.flatMap((entry) => {
      if (!entry.isFile()) return []
      return [relative(directory, join(entry.parentPath, entry.name))]
    })
    expect(files.length).toBeGreaterThan(100)
    for (const file of files) {
      expect(await readFile(join(fresh, destination, file))).toEqual(
        await readFile(join(directory, file))
      )
    }
    expect(await readFile(join(fresh, 'granary-lock.json'), 'utf8')).toBe(lock)
    const localPage = join(fresh, destination, page)
    await writeFile(localPage, '# Consumer edit\n')
    await expect(run(['install', '--cwd', fresh])).rejects.toMatchObject({ code: 1 })
    expect(await readFile(localPage, 'utf8')).toBe('# Consumer edit\n')
    expect(await readFile(join(fresh, 'granary-lock.json'), 'utf8')).toBe(lock)
    console.info(`nextjs@16 resolved ${tag}: ${files.length} docs reproduced byte-for-byte.`)
  })

  it('installs two 15.x versions at readable default paths with root configuration and lockfiles', async () => {
    const { project, run } = await installedCli()
    const tags = ['v15.4.0', 'v15.5.0']
    const metadataPath = 'packages/next/package.json'
    const config = JSON.stringify({
      name: 'nextjs-multiple-minors',
      packs: {
        'github:vercel/next.js': tags.map((tag) => ({
          tag,
          files: { include: [page, metadataPath] },
        })),
      },
    })
    await writeFile(join(project, 'granary.json'), config)
    const installed = await run(['install'])
    expect(installed.stdout + installed.stderr).toContain('Restored 2 locked pack(s).')
    const savedConfig = await readFile(join(project, 'granary.json'), 'utf8')
    expect(JSON.parse(savedConfig)).toEqual(JSON.parse(config))
    const lock = await readFile(join(project, 'granary-lock.json'), 'utf8')
    expect(JSON.parse(lock)).toMatchObject({
      packs: tags.map((tag) => ({
        request: { destination: `.granary/context/github/vercel/next.js/${tag}` },
        definition: { revision: expect.stringMatching(/^[a-f0-9]{40}$/) },
      })),
    })
    for (const tag of tags) {
      const directory = join(project, '.granary/context/github/vercel/next.js', tag)
      expect(JSON.parse(await readFile(join(directory, metadataPath), 'utf8'))).toMatchObject({
        version: tag.slice(1),
      })
      expect(await readFile(join(directory, page), 'utf8')).toContain('title: Installation')
    }
    await rm(join(project, '.granary/context'), { recursive: true })
    await run(['install'])
    for (const tag of tags) {
      const directory = join(project, '.granary/context/github/vercel/next.js', tag)
      expect(await readFile(join(directory, page), 'utf8')).toContain('title: Installation')
    }
    expect(await readFile(join(project, 'granary.json'), 'utf8')).toBe(savedConfig)
    expect(await readFile(join(project, 'granary-lock.json'), 'utf8')).toBe(lock)
    expect(await readdir(join(project, '.granary/context/github/vercel/next.js'))).toEqual(tags)
  })

  it('adopts an exact release through install shorthand with custom output and restores the same bytes', async () => {
    const { project, run } = await installedCli()
    const installed = await run(['install', 'nextjs@16.0.0', '--output', 'reference/nextjs'])
    await run(['validate'])
    expect(installed.stdout + installed.stderr).toContain('Installed context. 1 pack(s) locked.')
    const destination = join(project, 'reference/nextjs', page)
    const content = await readFile(destination, 'utf8')
    expect(content).toContain('title: Installation')
    expect(content).toContain('pnpm create next-app@latest my-app --yes')
    const lock = await readFile(join(project, 'granary-lock.json'), 'utf8')
    expect(JSON.parse(lock)).toMatchObject({
      packs: [
        {
          definition: { revision: expect.stringMatching(/^[a-f0-9]{40}$/) },
          groups: [
            {
              files: expect.arrayContaining([
                expect.objectContaining({
                  path: page,
                  hash: createHash('sha256').update(content).digest('hex'),
                }),
              ]),
            },
          ],
        },
      ],
    })
    expect((await run(['list'])).stdout).toContain('github:vercel/next.js')
    expect(await readdir(join(project, 'reference/nextjs'))).toEqual(['docs'])
    await rm(destination)
    await run(['install'])
    expect(await readFile(destination, 'utf8')).toBe(content)
    expect(await readFile(join(project, 'granary-lock.json'), 'utf8')).toBe(lock)
    console.info(
      `Next.js v16.0.0: installed and restored ${page} (${Buffer.byteLength(content)} bytes).`
    )
  })
})
