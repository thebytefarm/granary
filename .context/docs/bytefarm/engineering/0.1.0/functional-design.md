---
title: Functional design
description: 'Compose pure transformations and isolate effects behind explicit resource capabilities.'
---

# Functional design

Make domain behavior a transformation of values. Keep effects at deliberate boundaries.

## Composition and capabilities

### Why

Choosing a destination should not require a filesystem or logger. Separating that choice from execution makes it independently testable.

### Rules

- MUST keep domain transformations independent of I/O, logging, environment access, clocks, and randomness.
- MUST supply required external values as explicit inputs.
- MUST inject resource capabilities rather than hide them in globals.
- MUST compose small named operations with one responsibility.
- MUST prefer functions and value composition over mutable application inheritance.
- MUST keep third-party stateful clients inside the adapter that owns their lifecycle.
- MUST bound concurrent work that accesses external resources.
- MAY use native data types, constructors, and trait or protocol contracts prescribed by the language pack.

## Enforcement

Pure unit tests and real resource integration tests verify the separation. Review checks hidden dependencies and capability ownership.
