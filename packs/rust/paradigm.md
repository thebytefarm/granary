---
title: Paradigm
description: 'Compose native Rust functions and immutable values while isolating resource effects.'
---

# Paradigm

Prefer a pure domain core with explicit resource capabilities at its edges.

<standard id="paradigm-native-functional-design">

## Native functional design

<why>

### Why

Rust already has value types and explicit ownership. Applying the functional policy should use those primitives rather than imitate a JavaScript object model.

</why>

<rules>

### Rules

<rule id="separate-domain-transformations-from-i-o-logging-clocks-and-environment">

- <level>MUST</level> separate domain transformations from I/O, logging, clocks, and environment access. <enforcement>[review]</enforcement>

</rule>

<rule id="supply-dependencies-through-explicit-parameters-or-resource-owning-adapters">

- <level>MUST</level> supply dependencies through explicit parameters or resource-owning adapters. <enforcement>[review]</enforcement>

</rule>

<rule id="prefer-functions-and-value-composition-over-application-inheritance-or">

- <level>MUST</level> prefer functions and value composition over application inheritance or mutable service state. <enforcement>[review]</enforcement>

</rule>

<rule id="use-structs-and-enums-to-express-domain-values-and">

- <level>MUST</level> use structs and enums to express domain values and trait contracts to express capabilities. <enforcement>[review]</enforcement>

</rule>

<rule id="prefer-an-iterator-transformation-when-it-makes-the-operation">

- <level>MUST</level> prefer an iterator transformation when it makes the operation clearer. <enforcement>[review]</enforcement>

</rule>

<rule id="keep-mutable-clients-and-handles-confined-to-their-adapter">

- <level>MUST</level> keep mutable clients and handles confined to their adapter lifetimes. <enforcement>[review]</enforcement>

</rule>

<rule id="use-immutable-bindings-for-domain-data">

- <level>MUST</level> use immutable bindings for domain data. <enforcement>[review]</enforcement>

</rule>

</rules>

<examples>

</examples>

<enforcement>

[review]

The compiler checks types and ownership. Pure tests and review verify effect isolation and capability design.

</enforcement>

</standard>

## Enforcement

The compiler checks types and ownership. Pure tests and review verify effect isolation and capability design.
