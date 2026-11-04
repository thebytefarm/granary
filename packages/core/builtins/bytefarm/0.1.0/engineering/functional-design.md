---
title: Functional design
description: 'Compose pure transformations and isolate effects behind explicit resource capabilities.'
---

# Functional design

Make domain behavior a transformation of values. Keep effects at deliberate boundaries.

<standard id="functional-design-composition-and-capabilities">

## Composition and capabilities

<why>

### Why

Choosing a destination should not require a filesystem or logger. Separating that choice from execution makes it independently testable.

</why>

<rules>

### Rules

<rule id="keep-domain-transformations-independent-of-i-o-logging-environment-access">

- <level>MUST</level> keep domain transformations independent of I/O, logging, environment access, clocks, and randomness. <enforcement>[review]</enforcement>

</rule>

<rule id="supply-required-external-values-as-explicit-inputs">

- <level>MUST</level> supply required external values as explicit inputs. <enforcement>[review]</enforcement>

</rule>

<rule id="inject-resource-capabilities-rather-than-hide-them-in-globals">

- <level>MUST</level> inject resource capabilities rather than hide them in globals. <enforcement>[review]</enforcement>

</rule>

<rule id="compose-small-named-operations-with-one-responsibility">

- <level>MUST</level> compose small named operations with one responsibility. <enforcement>[review]</enforcement>

</rule>

<rule id="prefer-functions-and-value-composition-over-mutable-application-inheritance">

- <level>MUST</level> prefer functions and value composition over mutable application inheritance. <enforcement>[review]</enforcement>

</rule>

<rule id="keep-third-party-stateful-clients-inside-the-adapter-that-owns">

- <level>MUST</level> keep third-party stateful clients inside the adapter that owns their lifecycle. <enforcement>[review]</enforcement>

</rule>

<rule id="bound-concurrent-work-that-accesses-external-resources">

- <level>MUST</level> bound concurrent work that accesses external resources. <enforcement>[review]</enforcement>

</rule>

<rule id="use-native-data-types-constructors-and-trait-or-protocol">

- <level>MAY</level> use native data types, constructors, and trait or protocol contracts prescribed by the language pack. <enforcement>[review]</enforcement>

</rule>

</rules>

<examples>

</examples>

<enforcement>

[review]

Pure unit tests and real resource integration tests verify the separation. Review checks hidden dependencies and capability ownership.

</enforcement>

</standard>

## Enforcement

Pure unit tests and real resource integration tests verify the separation. Review checks hidden dependencies and capability ownership.
