# Validate your first pack

Build Granary locally, validate its catalog, and restore the TypeScript context it consumes.

## Prerequisites

- A local Granary checkout
- Node.js 26 or newer
- The pnpm version pinned in the root `package.json`

The published `granary-ai@0.0.1` package is a coming-soon reservation. Use this workspace for the implemented CLI.

## 1. Install workspace dependencies

From the repository root:

```sh
pnpm install
```

## 2. Inspect the pack

Each pack has its own manifest. For example, `packs/typescript/granary.json` declares one independent leaf:

```json
{
  "name": "bytefarm/typescript-functional",
  "version": "0.1.0",
  "description": "Functional TypeScript standards.",
  "entry": "README.md",
  "files": ["*.md"]
}
```

The entry file indexes the standards. Each linked page is an ordinary Markdown file inside the pack. Root `granary.json` defines the three recommended presets by referencing independent pack directories and selects `bytefarm/recommended-typescript` as Granary's own dependency.

## 3. Validate the manifest

```sh
pnpm cli validate
pnpm cli validate --cwd packs/typescript
```

Expected result:

```text
Pack manifest is valid.
```

This builds the CLI and validates the root preset declarations and standalone TypeScript manifest fields without fetching external content. Installation checks selected files and entrypoint inclusion.

## 4. Read it with your agent

Restore the checked-in dependency lock, then ask the agent to start at the installed index:

```sh
pnpm cli install
```

```text
Read .context/INDEX.md. Read the shared and TypeScript standards relevant
to this task before making changes.
```

Granary's root `AGENTS.md` already uses that retrieval pattern. See [using agent context](../guides/use-agent-context.md) for how to adopt it elsewhere.

## Verification

```sh
pnpm validate
pnpm build
```

Next: [create a pack](../guides/create-pack.md), or [install context packs](../guides/install-packs.md).
