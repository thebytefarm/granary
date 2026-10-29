# Install your first context pack

Use the workspace CLI to install TypeScript and shared standards into a disposable project. The current manifest contract is implemented locally but has not been published yet.

## Prerequisites

- A Granary checkout with workspace dependencies installed.
- Node.js 26+, pnpm, and Git.
- Run commands from the checkout root.

## 1. Build the CLI

```sh
pnpm build
```

## 2. Install into a fresh consumer

```sh
CONSUMER="$(mktemp -d)"
pnpm cli add "file:$PWD/packs#recommended-typescript" --output .granary/context/docs/bytefarm --cwd "$CONSUMER"
```

This writes five components and `.granary/context/INDEX.md` in the consumer, not the Granary checkout. `granary.json` and `granary-lock.json` stay at its root. Granary generates `.granary/.gitignore` to ignore installed context and cache files.

## 3. Read the installed index

```sh
cat "$CONSUMER/.granary/context/INDEX.md"
```

It links engineering, Git, documentation, agent instructions, and TypeScript. Tell your coding agent to read this index and the standards relevant to its current task.

## 4. Verify locked restoration

```sh
pnpm cli install --cwd "$CONSUMER"
pnpm cli list --cwd "$CONSUMER"
```

Expect five locked payloads and no moved upstream revisions. In a real project, inspect and commit the manifest and lock so teammates can restore the same selection. Local sources must remain available at their recorded paths.

## Next steps

[Browse prebuilt packs](../packs/index.mdx), [create a pack](../guides/create-pack.md), or [choose other sources](../guides/install-packs.md).
