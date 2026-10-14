---
title: Quick starts
description: 'Take a new reader to one working result in at most five steps, with executable commands and clear output.'
---

# Quick starts

A quick start proves the first useful result. It should take the reader from prerequisites to working local context without asking them to design a pack first.

## Shortest working path

### Why

A beginner cannot choose between several source formats before seeing an installation work. One selected path establishes the result that later guides can expand.

### Rules

- MUST state What you will build before the steps.
- MUST list the runtime, package manager, working directory, and required initial state.
- MUST use at most five numbered steps.
- MUST keep each executable block complete and valid for the stated working directory.
- MUST make the Result section show an observable success condition.
- MUST send alternatives and detailed explanation to linked Next steps.
- MUST identify source-workspace commands when the released package does not yet implement the example.
- SHOULD use a disposable consumer for demonstrations that create config, lock, or installed files.

## Example structure

This example models the checked-in CLI, not a claim about an npm release.

````md
# Install your first context pack

## What you will build

A temporary consumer with local reference material and a locked installation.

## Prerequisites

Run from a Granary checkout with Node.js 26+ and its pinned pnpm version.

## 1. Prepare the workspace

```sh
pnpm install
pnpm build
```

## 2. Install into a fresh consumer

```sh
CONSUMER="$(mktemp -d)"
pnpm cli add "$PWD" --pack recommended-typescript --cwd "$CONSUMER"
```

## 3. Restore recorded content

```sh
pnpm cli install --cwd "$CONSUMER"
```

## Result

```sh
pnpm cli list --cwd "$CONSUMER"
```

Expect the standards identity, its content version, and the `docs` group.

## Next steps

Read the installed index, then choose a guide for authoring or selecting content.
````

## Enforcement

Component-content tests check standard metadata and heading structure. Review verifies the five-step limit, named task sections, clean-consumer starting state, and observed result.

See [Guides](guides.md) for task variations and [Tutorials](tutorials.md) for learning-oriented explanations.
