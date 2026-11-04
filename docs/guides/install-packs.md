# Install context packs

Install selected reference material from local directories or Git repositories.

## Prerequisites

- Node.js 26+, Git, and `granary-ai` installed with `npm install --global granary-ai`.
- Run from your consuming project's root.
- For the distributed-set example, clone `thebytefarm/granary` into a sibling directory named `granary-packs`. This is the pack source; no CLI build is needed.

## 1. Inspect a declared source

```sh
granary add file:../granary-packs/packs --list
```

This lists the root and declared recommended sets and their members without writing consumer files. Manifestless sources have no named entries but remain installable.

## 2. Install the TypeScript set

```sh
granary add file:../granary-packs/packs#recommended-typescript --output .granary/context/docs/bytefarm
```

Granary writes five component directories, root `granary.json` and `granary-lock.json`, and `.granary/.gitignore`. It also links their reference entrypoints directly in a managed region of root `AGENTS.md`, preserving existing instructions. Generated context and cache files are ignored automatically. Only the selected set is adopted. For a single component, point at its directory instead:

```sh
granary add file:../granary-packs/packs/rust --output reference/rust
```

## 3. Select ordinary upstream files

For stable Next.js 15/16 docs, use the built-in recipe instead of designing a selection:

```sh
granary add nextjs@16
```

It installs `docs/**` from the highest matching stable tag and records the exact resolution. `granary install nextjs@16` is equivalent; bare `granary install` restores. Add another explicit version to keep both, such as `granary add nextjs@15.5.0`. See [curated Next.js documentation](../reference/cli.md#curated-nextjs-documentation) for limits.

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

Inspect and commit the consumer config, lock, and `AGENTS.md`. Git sources restore recorded commits while available upstream. Local sources must remain accessible and retain their locked bytes.

## Verification

Read the Granary region in `AGENTS.md` for installed entrypoints. Missing managed files can be restored; changed upstream bytes, unaccepted local edits, and mismatching intent fail explicitly. Inspect accepted customization data for secrets before sharing a lock.

## Troubleshooting

Already declared selections should be restored, not added again. Another explicit tag may be added alongside them. To replace a selection or change its files, edit the manifest and prepare a reviewed update. If Git access fails, verify existing repository credentials. Unknown members must be declared by the source, not inferred from directory names. Unaccepted local edits block restoration rather than being overwritten; deleting a managed file recreates it on restore unless that deletion was accepted through review.

## Next steps

[Browse prebuilt packs](../packs/index.mdx) or [point your agent at installed context](use-agent-context.md).
