---
title: Testing
description: 'Test consequential decisions and real boundaries with observable success and failure contracts.'
---

# Testing

Choose the test layer from the contract at risk.

## Behavioral evidence

### Why

A mocked writer cannot prove that an installation preserves unrelated files. Real disposable resources expose boundary mistakes.

### Rules

- MUST test consequential pure decisions, validation failures, and failure propagation.
- MUST exercise filesystem and process behavior with real disposable resources.
- MUST reserve test doubles for external services and inject them at the actual service boundary.
- MUST avoid replacing the internal behavior being tested with a fake.
- MUST give each test one observable behavior and a present-tense action name.
- MUST verify invariants as well as representative successful inputs.
- MUST keep paid services and nondeterministic model calls outside ordinary test runs.
- MUST report unavailable verification rather than claim it passed.
- MUST avoid tests that merely restate trivial wiring or a language guarantee.

## Enforcement

The consumer's test runner executes the cases. Review checks whether those cases exercise the behavior rather than a substitute for it.
