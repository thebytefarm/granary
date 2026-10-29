---
title: Types
description: 'Validate external Python values and model immutable domain alternatives with explicit typed contracts.'
---

# Types

Annotations describe a valid value; validation establishes whether an external value belongs to that type.

<standard id="types-validated-models">

## Validated models

<why>

### Why

A type annotation does not validate decoded JSON or an external SDK response at runtime.

</why>

<rules>

### Rules

<rule id="receive-untrusted-values-as-object-until-runtime-checks-validate">

- <level>MUST</level> receive untrusted values as `object` until runtime checks validate them. <enforcement>[review]</enforcement>

</rule>

<rule id="avoid-any-unchecked-casts-and-type-ignore-directives-that-bypass">

- <level>MUST</level> avoid Any, unchecked casts, and type-ignore directives that bypass validation. <enforcement>[review]</enforcement>

</rule>

<rule id="represent-closed-alternatives-with-typed-unions-literals-or-enums">

- <level>MUST</level> represent closed alternatives with typed unions, literals, or enums. <enforcement>[review]</enforcement>

</rule>

<rule id="use-frozen-records-with-immutable-fields-for-domain-models">

- <level>MUST</level> use frozen records with immutable fields for domain models. <enforcement>[review]</enforcement>

</rule>

<rule id="distinguish-absent-values-from-failures-that-require-an-explanation">

- <level>MUST</level> distinguish absent values from failures that require an explanation. <enforcement>[review]</enforcement>

</rule>

<rule id="use-protocols-for-injected-capabilities-when-structural-typing-is">

- <level>MUST</level> use Protocols for injected capabilities when structural typing is needed. <enforcement>[review]</enforcement>

</rule>

<rule id="retain-explicit-generic-result-annotations-so-error-types-do">

- <level>MUST</level> retain explicit generic Result annotations so error types do not degrade into Any. <enforcement>[review]</enforcement>

</rule>

<rule id="verify-the-returns-decorator-composition-types-with-its-supported-mypy">

- <level>MUST</level> verify the returns decorator/composition types with its supported mypy plugin. <enforcement>[review]</enforcement>

</rule>

</rules>

<examples>

</examples>

<enforcement>

[review]

Strict typechecks verify annotations and supported plugin inference. Boundary tests verify runtime validation.

</enforcement>

</standard>

## Enforcement

Strict typechecks verify annotations and supported plugin inference. Boundary tests verify runtime validation.
