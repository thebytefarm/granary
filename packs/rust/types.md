---
title: Types
description: 'Use enums, newtypes, and validated boundaries to represent valid Rust domain states.'
---

# Types

Model alternatives with enums and validate external values before treating them as domain data.

<standard id="types-valid-states">

## Valid states

<why>

### Why

An enum prevents combinations of optional fields that no operation can handle meaningfully.

</why>

<rules>

### Rules

<rule id="use-enums-for-closed-alternatives-and-option-for-meaningful">

- <level>MUST</level> use enums for closed alternatives and Option for meaningful absence. <enforcement>[review]</enforcement>

</rule>

<rule id="use-result-for-a-failure-with-an-explanation-rather">

- <level>MUST</level> use Result for a failure with an explanation rather than overload Option. <enforcement>[review]</enforcement>

</rule>

<rule id="keep-external-deserialization-separate-from-domain-validation">

- <level>MUST</level> keep external deserialization separate from domain validation. <enforcement>[review]</enforcement>

</rule>

<rule id="use-private-fields-or-validated-constructors-when-arbitrary-construction">

- <level>MUST</level> use private fields or validated constructors when arbitrary construction would violate an invariant. <enforcement>[review]</enforcement>

</rule>

<rule id="use-generics-or-impl-trait-when-static-capability-dispatch">

- <level>MUST</level> use generics or `impl Trait` when static capability dispatch is sufficient. <enforcement>[review]</enforcement>

</rule>

<rule id="justify-dynamic-dispatch-and-heap-allocation-rather-than-select">

- <level>MUST</level> justify dynamic dispatch and heap allocation rather than select them by habit. <enforcement>[review]</enforcement>

</rule>

<rule id="use-newtypes-to-distinguish-values-with-the-same-underlying">

- <level>MAY</level> use newtypes to distinguish values with the same underlying representation. <enforcement>[review]</enforcement>

</rule>

</rules>

<examples>

</examples>

<enforcement>

[review]

The compiler checks enum and capability types. Validation tests establish invariants that types alone cannot express.

</enforcement>

</standard>

## Enforcement

The compiler checks enum and capability types. Validation tests establish invariants that types alone cannot express.
