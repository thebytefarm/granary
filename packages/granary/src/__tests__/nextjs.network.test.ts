import { createHash } from 'node:crypto'
import { readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { installedCli } from './support.ts'

const page = 'docs/01-app/01-getting-started/01-installation.mdx'

describe('live Next.js context installation', () => {
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

  it('installs pinned upstream documentation and restores the same bytes through the installed CLI', async () => {
    const { project, run } = await installedCli()
    await writeFile(
      join(project, 'granary.json'),
      JSON.stringify({
        name: 'nextjs-consumer',
        packs: {
          'github:vercel/next.js': {
            tag: 'v16.0.0',
            files: { include: [page] },
            output: 'reference/nextjs',
          },
        },
      })
    )
    await run(['validate'])
    const installed = await run(['install'])
    expect(installed.stdout + installed.stderr).toContain('Restored 1 locked pack(s).')
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
            { files: [{ path: page, hash: createHash('sha256').update(content).digest('hex') }] },
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
