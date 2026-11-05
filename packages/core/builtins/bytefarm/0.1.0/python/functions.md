---
title: Functions
description: 'Declare focused typed Python operations with named inputs and explicit failure contracts.'
---

# Functions

Make required inputs, return values, and failure behavior visible at the call site.

<standard id="functions-contracts">

## Contracts

<why>

### Why

Keyword-only parameters prevent two semantically different values from being swapped silently.

</why>

<rules>

### Rules

<rule id="use-def-for-reusable-named-operations">

- <level>MUST</level> use `def` for reusable named operations. <enforcement>[review]</enforcement>

</rule>

<rule id="annotate-public-parameters-and-return-values">

- <level>MUST</level> annotate public parameters and return values. <enforcement>[review]</enforcement>

</rule>

<rule id="express-predictable-failure-with-a-typed-result-contract">

- <level>MUST</level> express predictable failure with a typed Result contract. <enforcement>[review]</enforcement>

</rule>

<rule id="use-keyword-only-parameters-for-multi-field-domain-requests-or-a">

- <level>MUST</level> use keyword-only parameters for multi-field domain requests or a named immutable request value. <enforcement>[review]</enforcement>

</rule>

<rule id="keep-one-responsibility-per-function">

- <level>MUST</level> keep one responsibility per function. <enforcement>[review]</enforcement>

</rule>

<rule id="avoid-mutable-default-arguments">

- <level>MUST</level> avoid mutable default arguments. <enforcement>[review]</enforcement>

</rule>

<rule id="use-small-lambdas-as-transform-callbacks">

- <level>MAY</level> use small lambdas as transform callbacks. <enforcement>[review]</enforcement>

</rule>

<rule id="keep-async-functions-at-genuinely-asynchronous-boundaries">

- <level>MUST</level> keep async functions at genuinely asynchronous boundaries. <enforcement>[review]</enforcement>

</rule>

</rules>

<examples>

## Example

```python
def total_lengths(names: tuple[str, ...]) -> int:
    return sum(len(name) for name in names)


assert total_lengths(("docs", "code")) == 8
```

</examples>

<enforcement>

[review]

Strict typechecks and configured lint establish signature contracts. Review checks responsibility and the need for async behavior.

</enforcement>

</standard>

## Enforcement

Strict typechecks and configured lint establish signature contracts. Review checks responsibility and the need for async behavior.
