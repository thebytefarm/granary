---
title: Runbooks
description: 'Make repeatable operating procedures verifiable at each step, with explicit rollback and escalation paths.'
---

# Runbooks

A runbook describes a repeatable procedure under a known starting state. Its steps need to be checkable without asking the reader to infer success.

<standard id="runbooks-operating-contract">

## Operating contract

<why>

### Why

Rebuilding a docs site and restoring locked material both have an expected state before and after the procedure. Verification at each step keeps a failure from being mistaken for progress.

</why>

<rules>

### Rules

<rule id="include-scope-and-prerequisites-that-identify-the-starting-state">

- <level>MUST</level> include Scope and Prerequisites that identify the starting state and affected material. <enforcement>[review]</enforcement>

</rule>

<rule id="give-each-numbered-step-an-action-and-an-observable">

- <level>MUST</level> give each numbered step an action and an observable verification. <enforcement>[review]</enforcement>

</rule>

<rule id="finish-with-verification-for-the-completed-procedure">

- <level>MUST</level> finish with Verification for the completed procedure. <enforcement>[review]</enforcement>

</rule>

<rule id="include-rollback-describing-how-to-return-to-the-prior">

- <level>MUST</level> include Rollback describing how to return to the prior working state. <enforcement>[review]</enforcement>

</rule>

<rule id="include-escalation-identifying-useful-diagnostic-evidence-and-the-boundary">

- <level>MUST</level> include Escalation identifying useful diagnostic evidence and the boundary for further action. <enforcement>[review]</enforcement>

</rule>

<rule id="keep-publication-credentials-and-deployment-authorization-in-the-consuming">

- <level>MUST</level> keep publication, credentials, and deployment authorization in the consuming repository's operating instructions. <enforcement>[review]</enforcement>

</rule>

<rule id="link-concepts-and-references-rather-than-embedding-unrelated-background">

- <level>MUST</level> link concepts and references rather than embedding unrelated background. <enforcement>[review]</enforcement>

</rule>

<rule id="state-when-rollback-needs-saved-source-files-or-version-control">

- <level>SHOULD</level> state when rollback needs saved source files or version-control history. <enforcement>[review]</enforcement>

</rule>

</rules>

<examples>

## Example outline

```md
# Rebuild the documentation site

## Scope

Generate and preview a local static site; this procedure does not publish it.

## Prerequisites

Use a source checkout with its installed dependencies and a known-good source revision.

## 1. Refresh the indexes

Run index generation; verify that the drift check passes.

## 2. Build the site

Build static output; verify the command exits successfully.

## 3. Inspect the preview

Open representative routes and diagrams; verify navigation and rendered content.

## Verification

Record the checked routes and any manual rendering checks.

## Rollback

Restore the prior source/config revision, regenerate indexes, and rebuild.

## Escalation

Report the failing source path and exact diagnostic; exclude credentials and environment contents.
```

</examples>

<enforcement>

[review]

Component-content tests check standard metadata and heading structure. An operator or reviewer checks required operating sections, per-step verification, recovery prerequisites, and actionable escalation.

See [Troubleshooting](troubleshooting.md) for short fixes and [Guides](guides.md) for ordinary tasks.

</enforcement>

</standard>

## Enforcement

Component-content tests check standard metadata and heading structure. An operator or reviewer checks required operating sections, per-step verification, recovery prerequisites, and actionable escalation.

See [Troubleshooting](troubleshooting.md) for short fixes and [Guides](guides.md) for ordinary tasks.
