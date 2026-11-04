# Install your first framework context

Install Next.js 16 documentation into a disposable project without choosing upstream files or cloning Granary.

## What you will build

A local documentation directory, direct reference links in `AGENTS.md`, and root manifest/lock files that reproduce the exact selection. This installs reference material, not the Next.js dependency.

## Prerequisites

- Node.js 26+, npm, and Git.
- Network access to GitHub. macOS and Linux are supported; Windows is not.
- Run from any writable directory. The example creates a disposable consumer and uses `--cwd` to target it.

## 1. Install the CLI

```sh
npm install --global granary-ai
granary --version
```

## 2. Install into a fresh consumer

```sh
CONSUMER="$(mktemp -d)"
granary add nextjs@16 --cwd "$CONSUMER"
```

The CLI prints the resolved stable tag and installs only `docs/**` beneath `.granary/context/github/vercel/next.js/<tag>/` in the consumer. `granary.json` records the exact tag and selection; `granary-lock.json` pins the commit and hashes. Granary generates `.granary/.gitignore` to ignore installed context and cache files. `install nextjs@16` is an equivalent alias; `add` is the canonical spelling.

## 3. Inspect the agent reference links

Granary creates or refreshes a `<granary-context>` region in root `AGENTS.md` linking directly to the installed Next.js material. Inspect it:

```sh
cat "$CONSUMER/AGENTS.md"
```

Your existing instructions and other managed regions stay unchanged. Granary does not create agent compatibility aliases or register maintenance skills automatically.

## 4. Verify locked restoration

```sh
granary install --cwd "$CONSUMER"
granary list --cwd "$CONSUMER"
```

Expect one locked selection and no moved upstream revisions. In a real project, inspect and commit the manifest, lock, and `AGENTS.md` so teammates can restore and discover the same selection. Git-backed restoration requires access to the locked commit; reading installed files works offline.

## Result

The consumer contains readable Next.js docs linked from `AGENTS.md`. Reinstall restores the locked version, not the latest release. Unaccepted edits fail rather than being overwritten; missing managed files are recreated. Explicit output overrides work but are not automatically Git-ignored.

## Next steps

[Browse prebuilt standards packs](../packs/index.mdx), [create a pack](../guides/create-pack.md), or [choose other sources and destinations](../guides/install-packs.md). Website ingestion and `granary query` are not implemented.
