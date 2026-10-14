---
title: Runbooks
description: 'Make repeatable operating procedures verifiable at each step, with explicit rollback and escalation paths.'
---

# Runbooks

A runbook describes a repeatable procedure under a known starting state. Its steps need to be checkable without asking the reader to infer success.

## Operating contract

### Why

Rebuilding a docs site and restoring locked material both have an expected state before and after the procedure. Verification at each step keeps a failure from being mistaken for progress.

### Rules

- MUST include Scope and Prerequisites that identify the starting state and affected material.
- MUST give each numbered step an action and an observable verification.
- MUST finish with Verification for the completed procedure.
- MUST include Rollback describing how to return to the prior working state.
- MUST include Escalation identifying useful diagnostic evidence and the boundary for further action.
- MUST keep publication, credentials, and deployment authorization in the consuming repository's operating instructions.
- MUST link concepts and references rather than embedding unrelated background.
- SHOULD state when rollback needs saved source files or version-control history.

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

## Enforcement

Component-content tests check standard metadata and heading structure. An operator or reviewer checks required operating sections, per-step verification, recovery prerequisites, and actionable escalation.

See [Troubleshooting](troubleshooting.md) for short fixes and [Guides](guides.md) for ordinary tasks.
