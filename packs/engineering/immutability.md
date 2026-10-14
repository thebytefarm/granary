---
title: Immutability
description: 'Return new domain values and keep mutable resource handles separate from application state.'
---

# Immutability

A state change produces a new value; it does not rewrite data another caller owns.

## Ownership

### Why

An installation plan must remain stable between inspection and execution. Shared mutation makes those stages disagree.

### Rules

- MUST treat arguments and shared domain values as immutable inputs.
- MUST return new values for domain state transitions.
- MUST derive counts and summaries from their authoritative collections.
- MUST keep mutable application state out of module bindings and captured factory state.
- MUST distinguish shallow readonly declarations from deeply immutable data.
- MUST avoid exposing mutable collections inside an otherwise immutable record.
- MAY retain a mutable resource handle in its owning adapter when required by the external API.

## Enforcement

Language-specific typing and configured checks cover some mutation paths. Tests verify state transitions; review checks aliasing and nested collections.
