---
title: Conditionals
description: 'Use early guards for rejection and exhaustive matches for Rust domain variants.'
---

# Conditionals

Keep successful paths readable and make closed alternatives explicit.

## Branching

### Why

An exhaustive match makes a newly added enum variant visible to callers at compile time.

### Rules

- MUST return early from invalid preconditions.
- MUST match closed domain enums exhaustively.
- MUST avoid wildcard arms that hide an unhandled repository-owned enum variant.
- MUST use `if let` for a genuinely partial match and `match` when every alternative matters.
- MUST consume the narrowed variant rather than recover it with unchecked extraction.
- MUST avoid nested conditionals around the successful operation.

## Enforcement

The compiler establishes exhaustive matching. Review distinguishes deliberate partial handling from missing cases.
