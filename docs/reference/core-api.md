# Core API

`@granary/core` exposes schemas, pack discovery, installation, and locked restoration to this workspace; it is not a published SDK.

## `packManifestSchema`

```ts
import { packManifestSchema } from '@granary/core'

const result = packManifestSchema.safeParse({
  name: 'bytefarm/engineering',
  version: '0.1.0',
  description: 'Shared functional engineering standards.',
  entry: 'README.md',
  files: ['**/*.md'],
})
```

| Property     | Behavior                                    |
| ------------ | ------------------------------------------- |
| Schema       | Strict Zod object                           |
| Unknown keys | Rejected                                    |
| Output       | Readonly manifest with frozen `files` array |
| Failure      | Zod safe-parse failure with field issues    |
| I/O          | None; pass already-loaded data              |

Field contracts are in [Pack manifest](pack-manifest.md).

## `PackManifest`

The type is inferred from the schema rather than maintained separately:

```ts
import type { PackManifest } from '@granary/core'

const manifest: PackManifest = {
  name: 'example/framework-reference',
  version: '0.1.0',
  description: 'Framework docs and implementation.',
  entry: 'README.md',
  files: ['README.md', 'docs/**/*.md', 'source/**/*.ts'],
}
```

It describes one portable bundle. Curated definitions, consumer intent, and locked content have their own schemas and inferred types.

## Other schemas

| Schema                 | Type                           | Contract                                                                       |
| ---------------------- | ------------------------------ | ------------------------------------------------------------------------------ |
| `catalogSchema`        | `Catalog`                      | Structured named providers, composite includes, dependencies, and destinations |
| `packDefinitionSchema` | `PackDefinition`               | Named content groups, upstream sources, and exact version mappings             |
| `presetSchema`         | `Preset`                       | Ordered exact-version leaf requests without recursive presets                  |
| `projectConfigSchema`  | `ProjectConfig`, `PackRequest` | Consumer source intent, selected groups, and destinations                      |
| `lockfileSchema`       | `Lockfile`                     | Definition versions, exact commits, file hashes, and destinations              |
| `sourceSchema`         | `Source`                       | Local directory or Git source intent                                           |

`ContentGroup` is the `docs`, `code`, or `examples` selection union. Field contracts are in [curated definitions](pack-definition.md), [project configuration](project-config.md), and [sources](sources.md).

`PresetRequest` records selected preset intent. Config and lock support optional `presets` alongside expanded leaf `packs`. `findPacks` catalogs both kinds using each entry's `kind`; `addPacks` expands and deduplicates preset members, and `installPacks` verifies pinned preset definitions and membership before restoring leaves. See [presets](presets.md).

## Installation operations

`findPacks`, `addPacks`, `installPacks`, `readLockfile`, `readCatalogProject`, and `validateCatalog` return asynchronous `Result` objects from `massaman/control`. `InstallationError` has the stable `kind` values `invalid`, `io`, `conflict`, and `drift`. Narrow results before reading their values.

`readCatalogProject({ project })` reads a structured root document, resolves initial selected dependencies, or reconstructs normalized intent from existing pinned lock records. Its `ProjectConfig.document` preserves authored declarations when `addPacks` updates concise dependencies. `validateCatalog({ project, document })` checks a validated catalog's local payload entrypoints without fetching external sources.

```ts
import { isErr } from 'massaman/control'

import { addPacks, projectConfigSchema } from '@granary/core'

const result = await addPacks({
  project: process.cwd(),
  config: projectConfigSchema.parse({ packs: [] }),
  source: { kind: 'local', path: '../granary' },
  packs: ['recommended-typescript'],
})

if (isErr(result)) {
  console.error(result.error.kind, result.error.message)
}
```

This example runs in a fresh consumer beside the Granary checkout. Existing consumers must supply their matching validated config. `findPacks` reads only declared entries from structured catalogs without installing; `installPacks` restores locked identities or creates the first lock for a structured document's declared dependencies. `readLockfile` returns an empty lock for a missing file only when `required` is false.

## CLI integration

Validation uses maltty loading with the catalog and standalone pack schemas. Installer commands normalize structured JSON through core and retain maltty loading for legacy consumer config. Core owns domain validation, portable source metadata, Git retrieval, and installation behavior.
