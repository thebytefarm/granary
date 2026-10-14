# Install context packs

Install selected docs and source from local directories or Git repositories with the workspace CLI.

## Prerequisites

- Node.js 26 or newer and the pinned pnpm version.
- A local Granary checkout; the npm release remains a placeholder.
- Git for repository-backed sources.

## 1. Inspect a source

From the Granary root:

```sh
pnpm cli add . --list
```

The result lists identities, available content groups, and descriptions. It writes no consumer files.

## 2. Install local material

```sh
CONSUMER="$(mktemp -d)"
pnpm cli add "$PWD" --pack recommended-typescript --cwd "$CONSUMER"
```

Granary creates five component directories under `.context/docs/bytefarm/`, an index, concise `granary.json` dependencies, and a lockfile. Use `--pack` identities or unambiguous slugs when a catalog has several entries. A source with exactly one pack can select it automatically.

To install a single independent pack instead of a recommended preset, point at its directory:

```sh
SINGLE_PACK_CONSUMER="$(mktemp -d)"
pnpm cli add "$PWD/packs/rust" --cwd "$SINGLE_PACK_CONSUMER"
```

This selects only `bytefarm/rust-functional` from its own `granary.json`. Use `pnpm cli add ./packs --list` to inspect the seven pack directories; the repository-root source lists the three recommended presets.

## 3. Choose versioned docs and code

The [curated React example](../reference/pack-definition.md) uses separate upstream repositories:

```sh
pnpm cli add ./docs/examples/react \
  --package-version 19.2.0 \
  --content docs code \
  --output reference
```

In a new structured consumer, this places docs under `reference/docs/bytefarm/react/19.2.0/` and selected source under the hidden, ignored `.context/repos/bytefarm/react/19.2.0/`. The documentation override is recorded for this pack. Omit `--content` to install every declared group. Existing legacy consumers retain their original code layout.

For a different consumer, use `--cwd` and an absolute source path. Relative local sources are interpreted from that consumer, not from the Granary checkout.

## 4. Restore and inspect

```sh
pnpm cli install
pnpm cli list
```

Commit consumer config and lock metadata to share intent. Git sources restore exact recorded commits while available upstream. Local sources must be accessible at their recorded paths and retain their locked bytes.

## Verification

Read `.context/INDEX.md` or the overridden root's index. It links each selected group to its entrypoint. Missing files can be restored; edited managed files, changed local sources, and mismatched config fail explicitly. `update` and `remove` remain planned.
