---
title: Paradigm
description: 'Compose native Rust functions and immutable values while isolating resource effects.'
---

# Paradigm

Prefer a pure domain core with explicit resource capabilities at its edges.

## Native functional design

### Why

Rust already has value types and explicit ownership. Applying the functional policy should use those primitives rather than imitate a JavaScript object model.

### Rules

- MUST separate domain transformations from I/O, logging, clocks, and environment access.
- MUST supply dependencies through explicit parameters or resource-owning adapters.
- MUST prefer functions and value composition over application inheritance or mutable service state.
- MUST use structs and enums to express domain values and trait contracts to express capabilities.
- MUST prefer an iterator transformation when it makes the operation clearer.
- MUST keep mutable clients and handles confined to their adapter lifetimes.
- MUST use immutable bindings for domain data.

## Enforcement

The compiler checks types and ownership. Pure tests and review verify effect isolation and capability design.
