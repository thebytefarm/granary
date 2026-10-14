---
title: Functions
description: 'Declare focused typed Python operations with named inputs and explicit failure contracts.'
---

# Functions

Make required inputs, return values, and failure behavior visible at the call site.

## Contracts

### Why

Keyword-only parameters prevent two semantically different values from being swapped silently.

### Rules

- MUST use `def` for reusable named operations.
- MUST annotate public parameters and return values.
- MUST express predictable failure with a typed Result contract.
- MUST use keyword-only parameters for multi-field domain requests or a named immutable request value.
- MUST keep one responsibility per function.
- MUST avoid mutable default arguments.
- MAY use small lambdas as transform callbacks.
- MUST keep async functions at genuinely asynchronous boundaries.

## Example

```python
def total_lengths(names: tuple[str, ...]) -> int:
    return sum(len(name) for name in names)


assert total_lengths(("docs", "code")) == 8
```

## Enforcement

Strict typechecks and configured lint establish signature contracts. Review checks responsibility and the need for async behavior.
