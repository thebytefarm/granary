---
title: Commits
description: 'Describe one scoped change and preserve the consumer repository’s history and release rules.'
---

# Commits

Make the affected surface and intended change visible in the subject.

## History

### Why

A scoped commit is easier to inspect and revert than a batch of unrelated changes.

### Rules

- MUST follow the consumer's branch and commit authorization rules.
- MUST use Conventional Commits unless the repository specifies an established alternative.
- MUST choose a scope from the actual changed capability or package.
- MUST keep the subject imperative and identify breaking contracts explicitly.
- MUST inspect the worktree and complete diff before staging.
- MUST stage only the intended changes and exclude secrets.
- MUST fix hook failures rather than bypass them.
- MUST include the consumer's required release note when shipped behavior changes.
- MUST obtain release authorization independently of writing a release note.

## Example

```text
fix(installer): preserve locally edited references
```

## Enforcement

Configured commit hooks validate their supported conventions. Review checks scope, release implications, and authorization.
