---
title: Paradigm
description: 'Build behavior from immutable functions, inject resources through factories, and isolate effects in adapters.'
---

# Paradigm

Authored TypeScript uses functions and immutable values. Resource access is a boundary capability, not a reason to introduce an application class hierarchy.

## Factories and composition

### Why

A source reader should reveal which filesystem or Git capability it needs. A factory can provide that capability without attaching behavior to `this`.

### Rules

- MUST construct reusable resource capabilities with factories that capture injected dependencies.
- MUST assemble behavior by combining functions and plain capabilities rather than inheriting from application classes.
- MUST exclude authored classes, class expressions, custom Error subclasses, class-dependent decorators, and `this`-based application behavior.
- MAY create an instance required by a third-party library inside the adapter that owns it.
- MAY wrap required third-party inheritance in a dedicated adapter when that API leaves no alternative.
- MUST prefer a collection transform or named function over an equivalent loop or immediately invoked function.

## Pure logic and effects

### Why

Choosing a content group can be tested from values alone. Reading its files requires a resource adapter; mixing those jobs forces every selection test to account for I/O.

### Rules

- MUST keep domain transformations independent of I/O, log output, and clock access.
- MUST place effects in CLI handlers or the resource-owning adapter.
- MUST supply time and other external inputs as values to the logic that needs them.
- MUST declare authored bindings with `const`, without later reassignment.

Read [State](state.md) for ownership rules and [Errors](errors.md) for failure contracts.

## Enforcement

Typechecks and configured lint rules establish their supported contracts. Tests and review verify effect isolation, capability ownership, and unconfigured syntax prohibitions.
