---
title: Types
description: 'Use enums, newtypes, and validated boundaries to represent valid Rust domain states.'
---

# Types

Model alternatives with enums and validate external values before treating them as domain data.

## Valid states

### Why

An enum prevents combinations of optional fields that no operation can handle meaningfully.

### Rules

- MUST use enums for closed alternatives and Option for meaningful absence.
- MUST use Result for a failure with an explanation rather than overload Option.
- MUST keep external deserialization separate from domain validation.
- MUST use private fields or validated constructors when arbitrary construction would violate an invariant.
- MUST use generics or `impl Trait` when static capability dispatch is sufficient.
- MUST justify dynamic dispatch and heap allocation rather than select them by habit.
- MAY use newtypes to distinguish values with the same underlying representation.

## Enforcement

The compiler checks enum and capability types. Validation tests establish invariants that types alone cannot express.
