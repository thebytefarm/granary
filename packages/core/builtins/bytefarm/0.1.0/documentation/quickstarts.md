---
title: Quick starts
description: 'Take a new reader to one working result in at most five steps, with executable commands and clear output.'
---

# Quick starts

A quick start proves the first useful result. It should take the reader from prerequisites to working local context without asking them to design a pack first.

<standard id="quickstarts-shortest-working-path">

## Shortest working path

<why>

### Why

A beginner cannot choose between several source formats before seeing an installation work. One selected path establishes the result that later guides can expand.

</why>

<rules>

### Rules

<rule id="state-what-you-will-build-before-the-steps">

- <level>MUST</level> state What you will build before the steps. <enforcement>[review]</enforcement>

</rule>

<rule id="list-the-runtime-package-manager-working-directory-and-required">

- <level>MUST</level> list the runtime, package manager, working directory, and required initial state. <enforcement>[review]</enforcement>

</rule>

<rule id="use-at-most-five-numbered-steps">

- <level>MUST</level> use at most five numbered steps. <enforcement>[review]</enforcement>

</rule>

<rule id="keep-each-executable-block-complete-and-valid-for-the">

- <level>MUST</level> keep each executable block complete and valid for the stated working directory. <enforcement>[review]</enforcement>

</rule>

<rule id="make-the-result-section-show-an-observable-success-condition">

- <level>MUST</level> make the Result section show an observable success condition. <enforcement>[review]</enforcement>

</rule>

<rule id="send-alternatives-and-detailed-explanation-to-linked-next-steps">

- <level>MUST</level> send alternatives and detailed explanation to linked Next steps. <enforcement>[review]</enforcement>

</rule>

<rule id="identify-source-workspace-commands-when-the-released-package-does-not">

- <level>MUST</level> identify source-workspace commands when the released package does not yet implement the example. <enforcement>[review]</enforcement>

</rule>

<rule id="use-a-disposable-consumer-for-demonstrations-that-create-config">

- <level>SHOULD</level> use a disposable consumer for demonstrations that create config, lock, or installed files. <enforcement>[review]</enforcement>

</rule>

</rules>

<examples>

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

</examples>

<enforcement>

[review]

Component-content tests check standard metadata and heading structure. Review verifies the five-step limit, named task sections, clean-consumer starting state, and observed result.

See [Guides](guides.md) for task variations and [Tutorials](tutorials.md) for learning-oriented explanations.

</enforcement>

</standard>

## Enforcement

Component-content tests check standard metadata and heading structure. Review verifies the five-step limit, named task sections, clean-consumer starting state, and observed result.

See [Guides](guides.md) for task variations and [Tutorials](tutorials.md) for learning-oriented explanations.
