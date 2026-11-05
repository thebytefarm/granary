---
title: Tutorials
description: 'Teach through a bounded build: each step changes something the reader can inspect and explains one concept.'
---

# Tutorials

A tutorial teaches by building a small working example. Explain the decisions the reader is practicing, while keeping deeper contracts in reference pages.

<standard id="tutorials-learning-contract">

## Learning contract

<why>

### Why

Creating a bundle teaches entrypoints, file selection, and content versions better than listing their names. Each step needs a visible result so the reader can tell when to proceed.

</why>

<rules>

### Rules

<rule id="include-what-you-will-learn-what-you-will-build">

- <level>MUST</level> include What you will learn, What you will build, and Prerequisites. <enforcement>[review]</enforcement>

</rule>

<rule id="keep-the-build-to-at-most-seven-numbered-steps">

- <level>MUST</level> keep the build to at most seven numbered steps. <enforcement>[review]</enforcement>

</rule>

<rule id="state-the-visible-outcome-of-each-step">

- <level>MUST</level> state the visible outcome of each step. <enforcement>[review]</enforcement>

</rule>

<rule id="explain-the-concept-introduced-by-that-step-without-turning">

- <level>MUST</level> explain the concept introduced by that step without turning it into a full reference. <enforcement>[review]</enforcement>

</rule>

<rule id="keep-sample-identities-and-material-local-to-the-tutorial">

- <level>MUST</level> keep sample identities and material local to the tutorial rather than presenting them as catalog entries. <enforcement>[review]</enforcement>

</rule>

<rule id="finish-with-verification-summary-and-next-steps">

- <level>MUST</level> finish with Verification, Summary, and Next steps. <enforcement>[review]</enforcement>

</rule>

<rule id="include-troubleshooting-for-failures-likely-to-interrupt-the-build">

- <level>MUST</level> include Troubleshooting for failures likely to interrupt the build. <enforcement>[review]</enforcement>

</rule>

<rule id="link-a-quick-start-for-readers-who-only-need">

- <level>SHOULD</level> link a quick start for readers who only need the first working result. <enforcement>[review]</enforcement>

</rule>

</rules>

<examples>

## Example outline

```md
# Build a local reference pack

## What you will learn

How an entrypoint, positive file selection, and pack version describe existing material.

## What you will build

A small local bundle that another directory can install.

## Prerequisites

A Granary source checkout, Node.js 26+, the pinned pnpm version, and a POSIX shell.

## 1. Create the material

Write a short entrypoint and one guide; verify both files exist.

## 2. Describe the bundle

Write a manifest whose files include the entrypoint.

## 3. Validate and install

Validate the metadata, then install it into a fresh consumer.

## Verification

Inspect the installed files, generated index, config, and lock.

## Summary

The manifest selected existing files; the consumer recorded intent and concrete integrity.

## Troubleshooting

If the entrypoint is excluded, correct selection before retrying.

## Next steps

Extend the example into a curated definition when it needs separate upstream groups.
```

The outline describes sections, not a runnable shell transcript. A published tutorial must supply the complete files and commands for each step.

</examples>

<enforcement>

[review]

Component-content tests check standard metadata and heading structure. Review checks the tutorial's named task sections, step limit, learning sequence, and execution from its stated starting point.

See [Quick starts](quickstarts.md) and [References](references.md).

</enforcement>

</standard>

## Enforcement

Component-content tests check standard metadata and heading structure. Review checks the tutorial's named task sections, step limit, learning sequence, and execution from its stated starting point.

See [Quick starts](quickstarts.md) and [References](references.md).
