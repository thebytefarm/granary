---
title: Testing
description: 'Prove observable contracts with real local files and processes, reserving test doubles for external services.'
---

# Testing

Choose the test layer from the contract at risk. A schema decision and a packaged executable need different evidence.

## Layers and test doubles

### Why

A mocked file writer cannot prove that restoration preserves unrelated files. Disposable directories and real Git subprocesses exercise those contracts without requiring a paid service.

### Rules

- MUST cover consequential pure decisions, validation failures, and failure-handling branches with unit tests.
- MUST exercise filesystem, subprocess, and network-adapter contracts at an integration boundary.
- MUST supply actual files in disposable directories when verifying filesystem behavior.
- MUST limit test doubles to external services and inject their clients through adapter factories.
- MUST exercise internal modules directly rather than replacing the asserted behavior with a fake.
- MUST keep paid model calls and nondeterministic model assertions outside ordinary test runs.
- MUST avoid cases that only repeat a trivial pass-through or a TypeScript guarantee.
- MAY retain smoke tests against the built CLI to verify startup, packaging, and executable behavior.

## Organization and verification

### Why

The failing test name should explain the broken contract. Keeping cases beside their implementation makes that contract easier to maintain.

### Rules

- MUST colocate cases in `*.test.ts`; SHOULD use `*.integration.test.ts` for larger resource suites when a separate runner exists.
- MUST use `describe` groups and present-tense behavior verbs in `it` names.
- MUST keep each case focused on one behavior, allowing multiple assertions to establish it.
- MUST invoke the consuming repository's validation commands, using workspace filters when it has workspaces.
- MUST build a distributed artifact before testing that artifact's entrypoint.
- MUST report a testless package as testless, rather than describing it as covered.

## Enforcement

The configured test runner executes value and resource cases. Review checks real boundary use, meaningful failure coverage, and accurate verification reports.
