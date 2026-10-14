---
title: Testing
description: 'Verify typed Python outcomes, real resource boundaries, and the supported returns typing setup.'
---

# Testing

Test value contracts and the actual resource boundary, including failure propagation.

## Verification

### Why

A syntax check can parse a returns import without proving that the library is installed or its types are compatible.

### Rules

- MUST exercise successful and failed Result variants through observable outcomes.
- MUST test real disposable filesystem and subprocess resources.
- MUST execute examples in an isolated environment with their declared dependencies.
- MUST typecheck returns examples with the supported mypy version and returns plugin.
- MUST configure the consumer's lint and formatting checks and run them with tests.
- MUST avoid paid or nondeterministic external calls in ordinary suites.
- MUST use test assertions only for verification, not model them as domain failure handling.
- MUST report syntax-only verification distinctly from execution and typechecking.
- MAY use property tests for parsers and immutable transformations after dependency approval.

## Enforcement

The configured runner, typechecker, formatter, and exception-syntax checks enforce their contracts. Review checks meaningful coverage and real boundary use.
