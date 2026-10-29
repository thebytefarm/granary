---
title: Immutability
description: 'Return new domain values and keep mutable resource handles separate from application state.'
---

# Immutability

A state change produces a new value; it does not rewrite data another caller owns.

<standard id="immutability-ownership">

## Ownership

<why>

### Why

An installation plan must remain stable between inspection and execution. Shared mutation makes those stages disagree.

</why>

<rules>

### Rules

<rule id="treat-arguments-and-shared-domain-values-as-immutable-inputs">

- <level>MUST</level> treat arguments and shared domain values as immutable inputs. <enforcement>[review]</enforcement>

</rule>

<rule id="return-new-values-for-domain-state-transitions">

- <level>MUST</level> return new values for domain state transitions. <enforcement>[review]</enforcement>

</rule>

<rule id="derive-counts-and-summaries-from-their-authoritative-collections">

- <level>MUST</level> derive counts and summaries from their authoritative collections. <enforcement>[review]</enforcement>

</rule>

<rule id="keep-mutable-application-state-out-of-module-bindings-and">

- <level>MUST</level> keep mutable application state out of module bindings and captured factory state. <enforcement>[review]</enforcement>

</rule>

<rule id="distinguish-shallow-readonly-declarations-from-deeply-immutable-data">

- <level>MUST</level> distinguish shallow readonly declarations from deeply immutable data. <enforcement>[review]</enforcement>

</rule>

<rule id="avoid-exposing-mutable-collections-inside-an-otherwise-immutable-record">

- <level>MUST</level> avoid exposing mutable collections inside an otherwise immutable record. <enforcement>[review]</enforcement>

</rule>

<rule id="retain-a-mutable-resource-handle-in-its-owning-adapter">

- <level>MAY</level> retain a mutable resource handle in its owning adapter when required by the external API. <enforcement>[review]</enforcement>

</rule>

</rules>

<examples>

</examples>

<enforcement>

[review]

Language-specific typing and configured checks cover some mutation paths. Tests verify state transitions; review checks aliasing and nested collections.

</enforcement>

</standard>

## Enforcement

Language-specific typing and configured checks cover some mutation paths. Tests verify state transitions; review checks aliasing and nested collections.
