---
title: Conditionals
description: 'Exit invalid paths with guards and handle closed variants through exhaustive matching.'
---

# Conditionals

Put the rejection path first. When an operation receives a variant, make its possible outcomes visible in one exhaustive match.

<standard id="conditionals-branching">

## Branching

<why>

### Why

A reader should not have to trace nested branches to find the successful installation path. Adding a source variant should also make incomplete handlers fail typechecking.

</why>

<rules>

### Rules

<rule id="check-a-precondition-or-single-condition-with-a-braced">

- <level>MUST</level> check a precondition or single condition with a braced `if` that returns early. <enforcement>[review]</enforcement>

</rule>

<rule id="express-a-two-outcome-choice-with-guard-clause-returns">

- <level>MUST</level> express a two-outcome choice with guard-clause returns. <enforcement>[review]</enforcement>

</rule>

<rule id="handle-unions-and-choices-with-three-or-more-outcomes">

- <level>MUST</level> handle unions and choices with three or more outcomes using `match` from `massaman/match`. <enforcement>[review]</enforcement>

</rule>

<rule id="close-matches-on-repository-owned-unions-with-exhaustive">

- <level>MUST</level> close matches on repository-owned unions with `.exhaustive()`. <enforcement>[review]</enforcement>

</rule>

<rule id="finish-with-otherwise-only-for-an-open-input-domain">

- <level>MAY</level> finish with `.otherwise()` only for an open input domain, such as an external string or payload. <enforcement>[review]</enforcement>

</rule>

<rule id="avoid-ternary-expressions-switch-else-if-chains-and-guards">

- <level>MUST</level> avoid ternary expressions, `switch`, `else if` chains, and guards nested around the successful path. <enforcement>[review]</enforcement>

</rule>

<rule id="consume-the-narrowed-match-argument-rather-than-asserting-a">

- <level>MUST</level> consume the narrowed match argument rather than asserting a variant type. <enforcement>[review]</enforcement>

</rule>

<rule id="use-when-unless-or-ifelse-when-a-conditional-is">

- <level>SHOULD</level> use `when`, `unless`, or `ifElse` when a conditional is part of a composed pipeline. <enforcement>[review]</enforcement>

</rule>

</rules>

<examples>

</examples>

<enforcement>

[review]

Typed exhaustive matches establish closed-variant handling. Configure syntax-specific lint rules to reject forbidden branching forms; review checks guard structure and open-domain fallbacks.

</enforcement>

</standard>

<standard id="conditionals-jsx">

## JSX

<why>

### Why

JSX renders a numeric left operand even when an `&&` expression short-circuits. Explicit state handling avoids stray output and forgotten variants.

</why>

<rules>

### Rules

<rule id="give-conditional-rendering-a-boolean-left-operand">

- <level>MUST</level> give conditional `&&` rendering a boolean left operand. <enforcement>[review]</enforcement>

</rule>

<rule id="use-component-guard-returns-for-two-rendering-outcomes">

- <level>MUST</level> use component guard returns for two rendering outcomes. <enforcement>[review]</enforcement>

</rule>

<rule id="render-discriminated-state-unions-through-exhaustive-matches">

- <level>MUST</level> render discriminated state unions through exhaustive matches. <enforcement>[review]</enforcement>

</rule>

</rules>

<examples>

Introducing the matching dependency requires any approval specified by the consumer's operating instructions. Read the [shared principles](README.md#shared-principles) before selecting dependencies.

</examples>

<enforcement>

[review]

Typed exhaustive matches establish closed-variant handling. Configure syntax-specific lint rules to reject forbidden branching forms; review checks guard structure and open-domain fallbacks.

</enforcement>

</standard>

## Enforcement

Typed exhaustive matches establish closed-variant handling. Configure syntax-specific lint rules to reject forbidden branching forms; review checks guard structure and open-domain fallbacks.
