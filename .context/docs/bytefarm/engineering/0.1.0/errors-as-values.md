---
title: Errors as values
description: 'Represent expected failures as typed outcomes and contain external exception behavior at adapters.'
---

# Errors as values

Failure is part of the operation's return contract.

<standard id="errors-as-values-failure-boundaries">

## Failure boundaries

<why>

### Why

A missing source or invalid input is an expected outcome. Callers should handle its typed variant without searching exception messages.

</why>

<rules>

### Rules

<rule id="return-a-typed-result-for-an-operation-that-can">

- <level>MUST</level> return a typed Result for an operation that can fail predictably. <enforcement>[review]</enforcement>

</rule>

<rule id="classify-domain-failures-by-a-typed-variant-or-discriminant">

- <level>MUST</level> classify domain failures by a typed variant or discriminant. <enforcement>[review]</enforcement>

</rule>

<rule id="propagate-a-failed-outcome-until-the-boundary-responsible-for">

- <level>MUST</level> propagate a failed outcome until the boundary responsible for presentation handles it. <enforcement>[review]</enforcement>

</rule>

<rule id="keep-authored-throwing-raising-panicking-and-exception-control-flow-branches-out">

- <level>MUST</level> keep authored throwing, raising, panicking, and exception-control-flow branches out of application behavior. <enforcement>[review]</enforcement>

</rule>

<rule id="adapt-third-party-exceptions-inside-the-resource-owning-boundary-using-the">

- <level>MUST</level> adapt third-party exceptions inside the resource-owning boundary using the language pack's supported conversion mechanism. <enforcement>[review]</enforcement>

</rule>

<rule id="preserve-a-useful-cause-and-context-when-converting-a">

- <level>MUST</level> preserve a useful cause and context when converting a failure. <enforcement>[review]</enforcement>

</rule>

<rule id="avoid-unchecked-extraction-from-success-failure-containers">

- <level>MUST</level> avoid unchecked extraction from success/failure containers. <enforcement>[review]</enforcement>

</rule>

<rule id="keep-cancellation-and-process-termination-distinct-from-recoverable-domain">

- <level>MUST</level> keep cancellation and process termination distinct from recoverable domain failures. <enforcement>[review]</enforcement>

</rule>

</rules>

<examples>

</examples>

<enforcement>

[review]

Configured language checks can reject exception syntax and unchecked extraction. Failure-path tests and review establish propagation and adapter coverage.

</enforcement>

</standard>

## Enforcement

Configured language checks can reject exception syntax and unchecked extraction. Failure-path tests and review establish propagation and adapter coverage.
