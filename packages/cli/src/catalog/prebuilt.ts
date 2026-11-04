import { readFile, readdir } from 'node:fs/promises'
import { join } from 'node:path'

import { attemptAsync, isErr } from 'massaman/control'
import { z } from 'zod'

import type { manifestSchema } from '@granary/core/schemas'

import { toolPacks } from '#/catalog/tools.ts'

const standardPacks = [
  {
    name: 'recommended-typescript',
    label: 'Bytefarm TypeScript standards',
    hint: 'Shared engineering standards + functional TypeScript',
  },
  {
    name: 'recommended-rust',
    label: 'Bytefarm Rust standards',
    hint: 'Shared engineering standards + functional Rust',
  },
  {
    name: 'recommended-python',
    label: 'Bytefarm Python standards',
    hint: 'Shared engineering standards + functional Python',
  },
] as const

export const prebuiltPacks = [
  ...toolPacks.map((pack) => ({
    name: pack.name,
    label: pack.label,
    hint: 'Official docs · pinned snapshot · requires Git/network',
  })),
  ...standardPacks,
] as const

export const prebuiltNameSchema = z.enum(prebuiltPacks.map((pack) => pack.name))
export type PrebuiltName = z.infer<typeof prebuiltNameSchema>
export const prebuiltSource = 'builtin:bytefarm@0.1.0'
export const prebuiltOutput = '.granary/context/docs/bytefarm'

/**
 * Recommend tool docs and language standards from root project metadata, without installing anything.
 * @param project - Explicit consumer root; nested workspaces are not scanned.
 * @returns Matching sets in catalogue order, or an empty selection for unknown projects.
 */
export async function detectPrebuiltPacks(project: string): Promise<readonly PrebuiltName[]> {
  const files = await attemptAsync(() => readdir(project))
  if (isErr(files)) {
    return []
  }
  const metadata = await readPackageMetadata(project)
  const dependencies = readDependencies(metadata)
  const typescriptDependency = ['typescript', '@typescript/native-preview'].some(
    (name) => name in dependencies
  )
  const detected = {
    'recommended-typescript': files.value.includes('tsconfig.json') || typescriptDependency,
    'recommended-rust': files.value.includes('Cargo.toml'),
    'recommended-python': ['pyproject.toml', 'requirements.txt', 'setup.py'].some((path) =>
      files.value.includes(path)
    ),
  }
  const tools = toolPacks.filter(
    (pack) =>
      pack.dependencies.some((name) => name in dependencies) ||
      pack.markers.some((path) => files.value.includes(path))
  )
  return [
    ...tools.map((pack) => pack.name),
    ...standardPacks.filter((pack) => detected[pack.name]).map((pack) => pack.name),
  ]
}

/**
 * Build portable tool definitions and bundled standards selections from the checked-in catalog.
 * @param names - Explicitly selected catalogue entries; never installed solely from detection.
 * @returns Pinned upstream tool selections and versioned built-in standards, without checkout paths.
 */
export function prebuiltSelections(
  names: readonly PrebuiltName[]
): NonNullable<z.infer<typeof manifestSchema>['packs']> {
  return Object.fromEntries(
    names.map((name) => {
      const tool = toolPacks.find((pack) => pack.name === name)
      if (tool) {
        return [
          name,
          {
            description: tool.definition.description,
            packs: tool.definition.packs,
            output: `.granary/context/docs/${name}`,
          },
        ]
      }
      return [`${prebuiltSource}#${name}`, { output: prebuiltOutput }]
    })
  )
}

/**
 * @private
 */
function readDependencies(
  metadata: Awaited<ReturnType<typeof readPackageMetadata>>
): Readonly<Record<string, string>> {
  if (isErr(metadata)) {
    return {}
  }
  const dependencyMap = z.record(z.string(), z.string()).catch({})
  const parsed = z
    .object({
      dependencies: dependencyMap,
      devDependencies: dependencyMap,
      peerDependencies: dependencyMap,
      optionalDependencies: dependencyMap,
    })
    .safeParse(metadata.value)
  if (!parsed.success) {
    return {}
  }
  return {
    ...parsed.data.dependencies,
    ...parsed.data.devDependencies,
    ...parsed.data.peerDependencies,
    ...parsed.data.optionalDependencies,
  }
}

/**
 * @private
 */
async function readPackageMetadata(project: string) {
  return attemptAsync(async (): Promise<unknown> =>
    JSON.parse(await readFile(join(project, 'package.json'), 'utf8'))
  )
}
