---
title: Paradigm
description: 'Compose pure Python functions and immutable domain values with explicit effect boundaries.'
---

# Paradigm

Keep domain behavior independent of resource state and application inheritance.

<standard id="paradigm-functions-and-capabilities">

## Functions and capabilities

<why>

### Why

A pure operation can be tested from values alone. A mutable service object couples it to lifecycle and hidden state.

</why>

<rules>

### Rules

<rule id="use-named-functions-for-reusable-behavior">

- <level>MUST</level> use named functions for reusable behavior. <enforcement>[review]</enforcement>

</rule>

<rule id="isolate-i-o-logging-clocks-randomness-and-environment-access-in">

- <level>MUST</level> isolate I/O, logging, clocks, randomness, and environment access in adapters. <enforcement>[review]</enforcement>

</rule>

<rule id="inject-capabilities-explicitly-rather-than-retrieve-global-framework-state">

- <level>MUST</level> inject capabilities explicitly rather than retrieve global framework state. <enforcement>[review]</enforcement>

</rule>

<rule id="prefer-composition-over-application-inheritance-and-mutable-service-classes">

- <level>MUST</level> prefer composition over application inheritance and mutable service classes. <enforcement>[review]</enforcement>

</rule>

<rule id="avoid-class-based-application-behavior-when-a-function-and-explicit">

- <level>MUST</level> avoid class-based application behavior when a function and explicit capability suffice. <enforcement>[review]</enforcement>

</rule>

<rule id="declare-frozen-data-records-enums-typeddicts-and-protocols-to">

- <level>MAY</level> declare frozen data records, enums, TypedDicts, and Protocols to express types rather than service behavior. <enforcement>[review]</enforcement>

</rule>

<rule id="confine-required-third-party-class-instances-to-their-resource-owning-adapter">

- <level>MUST</level> confine required third-party class instances to their resource-owning adapter. <enforcement>[review]</enforcement>

</rule>

<rule id="bound-concurrent-external-work-and-preserve-async-cancellation-semantics">

- <level>MUST</level> bound concurrent external work and preserve async cancellation semantics. <enforcement>[review]</enforcement>

</rule>

</rules>

<examples>

</examples>

<enforcement>

[review]

Pure tests and real adapter tests verify observable boundaries. Typechecks and review establish capability contracts and state ownership.

</enforcement>

</standard>

## Enforcement

Pure tests and real adapter tests verify observable boundaries. Typechecks and review establish capability contracts and state ownership.
