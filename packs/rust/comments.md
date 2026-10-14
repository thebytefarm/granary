---
title: Comments
description: 'Document Rust public contracts, failure cases, and borrow requirements with verifiable examples.'
---

# Comments

Use rustdoc for caller-facing behavior and ordinary comments for hidden rationale.

## Public documentation

### Why

A Result signature does not enumerate which inputs fail or whether an operation performs I/O.

### Rules

- MUST document public items whose contract is not evident from their name and type.
- MUST describe input constraints, ownership, effects, and failure behavior.
- MUST include an Errors section for meaningful failure cases.
- MUST supply runnable rustdoc examples for consequential public behavior.
- MUST propagate example failures with Result instead of normalizing unchecked extraction in application examples.
- MUST explain the invariant of any required unsafe code at its owning boundary.
- MUST avoid comments that restate the next statement.

## Enforcement

Cargo doctests verify configured public examples. Review checks contract completeness and safety rationale.
