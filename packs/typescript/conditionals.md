---
title: Conditionals
description: 'Exit invalid paths with guards and handle closed variants through exhaustive matching.'
---

# Conditionals

Put the rejection path first. When an operation receives a variant, make its possible outcomes visible in one exhaustive match.

## Branching

### Why

A reader should not have to trace nested branches to find the successful installation path. Adding a source variant should also make incomplete handlers fail typechecking.

### Rules

- MUST check a precondition or single condition with a braced `if` that returns early.
- MUST express a two-outcome choice with guard-clause returns.
- MUST handle unions and choices with three or more outcomes using `match` from `massaman/match`.
- MUST close matches on repository-owned unions with `.exhaustive()`.
- MAY finish with `.otherwise()` only for an open input domain, such as an external string or payload.
- MUST avoid ternary expressions, `switch`, `else if` chains, and guards nested around the successful path.
- MUST consume the narrowed match argument rather than asserting a variant type.
- SHOULD use `when`, `unless`, or `ifElse` when a conditional is part of a composed pipeline.

## JSX

### Why

JSX renders a numeric left operand even when an `&&` expression short-circuits. Explicit state handling avoids stray output and forgotten variants.

### Rules

- MUST give conditional `&&` rendering a boolean left operand.
- MUST use component guard returns for two rendering outcomes.
- MUST render discriminated state unions through exhaustive matches.

Introducing the matching dependency requires any approval specified by the consumer's operating instructions. Read the [shared principles](README.md#shared-principles) before selecting dependencies.

## Enforcement

Typed exhaustive matches establish closed-variant handling. Configure syntax-specific lint rules to reject forbidden branching forms; review checks guard structure and open-domain fallbacks.
