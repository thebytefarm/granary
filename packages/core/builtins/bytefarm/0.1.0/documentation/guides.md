---
title: Guides
description: 'Document a task with prerequisites, ordered actions, an observable result, and fixes for known failures.'
---

# Guides

A guide helps a reader complete one task they already understand. Put options and background in linked reference and concept pages.

<standard id="guides-task-contract">

## Task contract

<why>

### Why

Installing selected content and authoring a definition are separate tasks. Combining them makes prerequisites and completion criteria unclear.

</why>

<rules>

### Rules

<rule id="start-the-title-with-an-action-verb-and-name">

- <level>MUST</level> start the title with an action verb and name the result. <enforcement>[review]</enforcement>

</rule>

<rule id="state-the-working-directory-supported-runtime-required-tools-and">

- <level>MUST</level> state the working directory, supported runtime, required tools, and initial state in Prerequisites. <enforcement>[review]</enforcement>

</rule>

<rule id="number-the-actions-in-execution-order">

- <level>MUST</level> number the actions in execution order. <enforcement>[review]</enforcement>

</rule>

<rule id="include-complete-commands-when-the-reader-is-expected-to">

- <level>MUST</level> include complete commands when the reader is expected to execute them. <enforcement>[review]</enforcement>

</rule>

<rule id="give-verification-an-observable-command-result-or-filesystem-outcome">

- <level>MUST</level> give Verification an observable command result or filesystem outcome. <enforcement>[review]</enforcement>

</rule>

<rule id="include-troubleshooting-for-known-failure-modes-and-link-detailed">

- <level>MUST</level> include Troubleshooting for known failure modes and link detailed diagnoses instead of duplicating them. <enforcement>[review]</enforcement>

</rule>

<rule id="finish-with-next-steps-that-continue-the-same-reader">

- <level>MUST</level> finish with Next steps that continue the same reader journey. <enforcement>[review]</enforcement>

</rule>

<rule id="keep-optional-variations-after-the-primary-task-with-reference">

- <level>SHOULD</level> keep optional variations after the primary task, with reference links for their contracts. <enforcement>[review]</enforcement>

</rule>

</rules>

<examples>

## Example structure

The example assumes a Granary source checkout and a fresh consumer configuration.

````md
# Install the standards pack

Install the checked-in engineering rules as ordinary files.

## Prerequisites

- Run from the Granary repository root.
- Use Node.js 26+ and the pinned pnpm version.
- Install into a fresh consumer directory.

## 1. Inspect the source

```sh
pnpm cli add . --list
```

## 2. Install docs

```sh
CONSUMER="$(mktemp -d)"
pnpm cli add "$PWD" --pack recommended-typescript --cwd "$CONSUMER"
```

## Verification

```sh
pnpm cli list --cwd "$CONSUMER"
```

Expect the standards identity and a `docs` group. Follow its reference link in root `AGENTS.md`.

## Troubleshooting

If the pack already exists, restore it with `pnpm cli install --cwd "$CONSUMER"` rather than adding it twice.

## Next steps

Point the agent at the installed entrypoint before starting a code change.
````

</examples>

<enforcement>

[review]

Component-content tests check standard metadata and heading structure. Guide prerequisites, numbered actions, required task sections, and command correctness require review and execution of the primary path.

See [Formatting](formatting.md), [References](references.md), and [Troubleshooting](troubleshooting.md).

</enforcement>

</standard>

## Enforcement

Component-content tests check standard metadata and heading structure. Guide prerequisites, numbered actions, required task sections, and command correctness require review and execution of the primary path.

See [Formatting](formatting.md), [References](references.md), and [Troubleshooting](troubleshooting.md).
