# Install context packs

Install selected reference material from local directories or Git repositories.

## Prerequisites

- Node.js 26+, Git, and the workspace CLI built from a Granary checkout. The current manifest contract is not published yet.
- Run from your consuming project's root. The commands below assume its workspace-built `granary` executable is on your PATH.
- A sibling Granary checkout named `granary-packs` for the distributed-set example.

## 1. Inspect a declared source

```sh
granary add file:../granary-packs/packs --list
```

This lists the root and declared recommended sets and their members without writing consumer files. Manifestless sources have no named entries but remain installable.

## 2. Install the TypeScript set

```sh
granary add file:../granary-packs/packs#recommended-typescript --output .granary/context/docs/bytefarm
```

Granary writes five component directories, `.granary/context/INDEX.md`, root `granary.json` and `granary-lock.json`, and `.granary/.gitignore`. Generated context and cache files are ignored automatically. Only the selected set is adopted. For a single component, point at its directory instead:

```sh
granary add file:../granary-packs/packs/rust --output reference/rust
```

## 3. Select ordinary upstream files

For a repository without Granary metadata, add a selection under `packs` in your `granary.json`:

```json
{
  "name": "my-app",
  "packs": {
    "github:vercel/next.js": {
      "tag": "v16.0.0",
      "files": { "include": ["docs/**", "examples/**"] },
      "output": "reference/nextjs"
    }
  }
}
```

This is a complete fresh-project example. In an existing project, preserve its entries and add the source rather than replacing the document. `granary install` creates the first lock; changing existing locked intent requires a [reviewed update](../reference/cli.md#reviewed-updates).

The [React example](../reference/pack-definition.md) demonstrates composing docs and implementation from independent pinned repositories.

## 4. Restore and inspect

```sh
granary install
granary list
```

Inspect and commit the consumer config and lock. Git sources restore recorded commits while available upstream. Local sources must remain accessible and retain their locked bytes.

## Verification

Read `.granary/context/INDEX.md` for installed entrypoints. Missing managed files can be restored; changed upstream bytes, unaccepted local edits, and mismatching intent fail explicitly. Inspect accepted customization data for secrets before sharing a lock.

## Troubleshooting

Already declared sources should be restored, not added again. To change selection or revisions, edit the manifest and prepare a reviewed update. If Git access fails, verify existing repository credentials. Unknown members must be declared by the source, not inferred from directory names.

## Next steps

[Browse prebuilt packs](../packs/index.mdx) or [point your agent at installed context](use-agent-context.md).
