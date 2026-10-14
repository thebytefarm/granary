---
title: Errors as values
description: 'Represent expected failures as typed outcomes and contain external exception behavior at adapters.'
---

# Errors as values

Failure is part of the operation's return contract.

## Failure boundaries

### Why

A missing source or invalid input is an expected outcome. Callers should handle its typed variant without searching exception messages.

### Rules

- MUST return a typed Result for an operation that can fail predictably.
- MUST classify domain failures by a typed variant or discriminant.
- MUST propagate a failed outcome until the boundary responsible for presentation handles it.
- MUST keep authored throwing, raising, panicking, and exception-control-flow branches out of application behavior.
- MUST adapt third-party exceptions inside the resource-owning boundary using the language pack's supported conversion mechanism.
- MUST preserve a useful cause and context when converting a failure.
- MUST avoid unchecked extraction from success/failure containers.
- MUST keep cancellation and process termination distinct from recoverable domain failures.

## Enforcement

Configured language checks can reject exception syntax and unchecked extraction. Failure-path tests and review establish propagation and adapter coverage.
