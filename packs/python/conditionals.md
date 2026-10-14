---
title: Conditionals
description: 'Use early Python guards and explicit variant handling without exception-driven branching.'
---

# Conditionals

Reject invalid paths first and keep the successful transformation visible.

## Branching

### Why

Using an exception to distinguish success from failure hides a normal domain alternative from the return type.

### Rules

- MUST use early-return guards for invalid preconditions.
- MUST handle closed domain alternatives explicitly with structural matching or typed guard branches.
- MUST avoid authored `raise`, `try`/`except`, and unchecked Result extraction for branching.
- MUST use Result `map` for successful pure transforms and `bind` for fallible transforms.
- MUST avoid conditional expressions and deeply nested branches around successful paths.
- MUST configure and verify exhaustiveness checks rather than assume Python match statements are exhaustive.
- MUST keep assertions for tests rather than runtime input validation.

## Enforcement

Syntax checks can reject exception-control-flow nodes. Strict typing and review establish variant handling; Python alone does not enforce exhaustive matching.
