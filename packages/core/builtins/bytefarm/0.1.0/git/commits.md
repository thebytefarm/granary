---
title: Commits
description: 'Describe one scoped change and preserve the consumer repository’s history and release rules.'
---

# Commits

Make the affected surface and intended change visible in the subject.

<standard id="commits-history">

## History

<why>

### Why

A scoped commit is easier to inspect and revert than a batch of unrelated changes.

</why>

<rules>

### Rules

<rule id="follow-the-consumer-s-branch-and-commit-authorization-rules">

- <level>MUST</level> follow the consumer's branch and commit authorization rules. <enforcement>[review]</enforcement>

</rule>

<rule id="use-conventional-commits-unless-the-repository-specifies-an-established">

- <level>MUST</level> use Conventional Commits unless the repository specifies an established alternative. <enforcement>[review]</enforcement>

</rule>

<rule id="choose-a-scope-from-the-actual-changed-capability-or">

- <level>MUST</level> choose a scope from the actual changed capability or package. <enforcement>[review]</enforcement>

</rule>

<rule id="keep-the-subject-imperative-and-identify-breaking-contracts-explicitly">

- <level>MUST</level> keep the subject imperative and identify breaking contracts explicitly. <enforcement>[review]</enforcement>

</rule>

<rule id="inspect-the-worktree-and-complete-diff-before-staging">

- <level>MUST</level> inspect the worktree and complete diff before staging. <enforcement>[review]</enforcement>

</rule>

<rule id="stage-only-the-intended-changes-and-exclude-secrets">

- <level>MUST</level> stage only the intended changes and exclude secrets. <enforcement>[review]</enforcement>

</rule>

<rule id="fix-hook-failures-rather-than-bypass-them">

- <level>MUST</level> fix hook failures rather than bypass them. <enforcement>[review]</enforcement>

</rule>

<rule id="include-the-consumer-s-required-release-note-when-shipped-behavior">

- <level>MUST</level> include the consumer's required release note when shipped behavior changes. <enforcement>[review]</enforcement>

</rule>

<rule id="obtain-release-authorization-independently-of-writing-a-release-note">

- <level>MUST</level> obtain release authorization independently of writing a release note. <enforcement>[review]</enforcement>

</rule>

</rules>

<examples>

## Example

```text
fix(installer): preserve locally edited references
```

</examples>

<enforcement>

[review]

Configured commit hooks validate their supported conventions. Review checks scope, release implications, and authorization.

</enforcement>

</standard>

## Enforcement

Configured commit hooks validate their supported conventions. Review checks scope, release implications, and authorization.
