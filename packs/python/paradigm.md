---
title: Paradigm
description: 'Compose pure Python functions and immutable domain values with explicit effect boundaries.'
---

# Paradigm

Keep domain behavior independent of resource state and application inheritance.

## Functions and capabilities

### Why

A pure operation can be tested from values alone. A mutable service object couples it to lifecycle and hidden state.

### Rules

- MUST use named functions for reusable behavior.
- MUST isolate I/O, logging, clocks, randomness, and environment access in adapters.
- MUST inject capabilities explicitly rather than retrieve global framework state.
- MUST prefer composition over application inheritance and mutable service classes.
- MUST avoid class-based application behavior when a function and explicit capability suffice.
- MAY declare frozen data records, enums, TypedDicts, and Protocols to express types rather than service behavior.
- MUST confine required third-party class instances to their resource-owning adapter.
- MUST bound concurrent external work and preserve async cancellation semantics.

## Enforcement

Pure tests and real adapter tests verify observable boundaries. Typechecks and review establish capability contracts and state ownership.
