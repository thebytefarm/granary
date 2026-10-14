---
title: Testing
description: 'Verify Rust value contracts, resource adapters, and public examples with real observable outcomes.'
---

# Testing

Combine focused value tests, resource integration tests, and public doctests.

## Verification

### Why

Ownership compilation does not prove that an adapter preserves unrelated files or reports the correct failure variant.

### Rules

- MUST test consequential valid and invalid inputs through native Result variants.
- MUST use real disposable local resources for filesystem and subprocess contracts.
- MUST run Cargo tests and public doctests for the affected crate.
- MUST run rustfmt and the consumer's configured Clippy checks.
- MUST keep fixture assertions distinct from production error handling.
- MUST isolate resource tests so parallel runs cannot alter another test's state.
- MAY use property tests for parsers and transformations after dependency approval.
- MAY use nextest when it is already part of the consumer's toolchain.

## Enforcement

Cargo, rustfmt, and configured Clippy invocations provide executable checks. Review checks whether the suite exercises the actual contract.
