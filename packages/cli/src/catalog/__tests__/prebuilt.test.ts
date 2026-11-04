import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { describe, expect, it, onTestFinished } from 'vitest'

import { detectPrebuiltPacks, prebuiltSelections } from '#/catalog/prebuilt.ts'
import { toolPacks } from '#/catalog/tools.ts'
import { parseSource } from '#/arguments.ts'

describe('prebuilt recommendations', () => {
  it.each(
    toolPacks.flatMap((pack) =>
      pack.dependencies.map((dependency) => ({ name: pack.name, dependency }))
    )
  )('recommends $name from $dependency', async ({ name, dependency }) => {
    const project = await workspace()
    await writeFile(
      join(project, 'package.json'),
      JSON.stringify({ dependencies: { [dependency]: '^1.0.0' } })
    )
    expect(await detectPrebuiltPacks(project)).toEqual([name])
  })

  it.each(['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies'])(
    'reads tool declarations from %s',
    async (field) => {
      const project = await workspace()
      await writeFile(
        join(project, 'package.json'),
        JSON.stringify({ [field]: { next: '^16.0.0', react: '^19.0.0', zod: '^4.0.0' } })
      )
      expect(await detectPrebuiltPacks(project)).toEqual(['nextjs', 'react', 'zod'])
    }
  )

  it.each(['next.config.js', 'next.config.mjs', 'next.config.ts', 'next.config.cjs'])(
    'detects Next.js from %s without package metadata',
    async (marker) => {
      const project = await workspace()
      await writeFile(join(project, marker), '')
      expect(await detectPrebuiltPacks(project)).toEqual(['nextjs'])
    }
  )

  it('retains valid dependency sections when another is malformed', async () => {
    const project = await workspace()
    await writeFile(
      join(project, 'package.json'),
      JSON.stringify({ dependencies: { next: '^16.0.0' }, devDependencies: false })
    )
    expect(await detectPrebuiltPacks(project)).toEqual(['nextjs'])
  })

  it('builds portable pinned selections directly from authored pack definitions', () => {
    const selections = prebuiltSelections([
      'nextjs',
      'tanstack-router',
      'tanstack-start',
      'recommended-typescript',
    ])
    for (const name of ['nextjs', 'tanstack-router', 'tanstack-start']) {
      expect(selections[name]).toEqual(
        expect.objectContaining({
          packs: toolPacks.find((pack) => pack.name === name)?.definition.packs,
          output: `.granary/context/docs/${name}`,
        })
      )
    }
    expect(selections['builtin:bytefarm@0.1.0#recommended-typescript']).toEqual({
      output: '.granary/context/docs/bytefarm',
    })
    expect(JSON.stringify(selections)).not.toContain('file:')
  })

  it.each(['tsconfig.json', 'Cargo.toml', 'pyproject.toml', 'requirements.txt', 'setup.py'])(
    'detects the root marker %s',
    async (marker) => {
      const project = await workspace()
      await writeFile(join(project, marker), '')
      expect(await detectPrebuiltPacks(project)).toHaveLength(1)
    }
  )

  it.each(['typescript', '@typescript/native-preview'])(
    'detects the %s dependency',
    async (dependency) => {
      const project = await workspace()
      await writeFile(
        join(project, 'package.json'),
        JSON.stringify({ devDependencies: { [dependency]: '*' } })
      )
      expect(await detectPrebuiltPacks(project)).toEqual(['recommended-typescript'])
    }
  )

  it('ignores malformed metadata and nested project markers', async () => {
    const project = await workspace()
    await writeFile(join(project, 'package.json'), '{invalid')
    await mkdir(join(project, 'nested'))
    await writeFile(join(project, 'nested/Cargo.toml'), '')
    expect(await detectPrebuiltPacks(project)).toEqual([])
  })

  it.each([
    'builtin:bytefarm@0.1.0@extra',
    'builtin:bytefarm@latest',
    'builtin:bytefarm@0.1.0#',
    'builtin:bytefarm@0.1.0#a#b',
  ])('rejects malformed locator %s', (source) => {
    expect(parseSource({ source }).success).toBe(false)
  })
})

async function workspace(): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), 'granary-detect-'))
  onTestFinished(() => rm(directory, { recursive: true, force: true }))
  return directory
}
