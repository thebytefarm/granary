---
title: Conditionals
description: 'Use early Python guards and explicit variant handling without exception-driven branching.'
---

# Conditionals

Reject invalid paths first and keep the successful transformation visible.

<standard id="conditionals-branching">

## Branching

<why>

### Why

Using an exception to distinguish success from failure hides a normal domain alternative from the return type.

</why>

<rules>

### Rules

<rule id="use-early-return-guards-for-invalid-preconditions">

- <level>MUST</level> use early-return guards for invalid preconditions. <enforcement>[review]</enforcement>

</rule>

<rule id="handle-closed-domain-alternatives-explicitly-with-structural-matching-or">

- <level>MUST</level> handle closed domain alternatives explicitly with structural matching or typed guard branches. <enforcement>[review]</enforcement>

</rule>

<rule id="avoid-authored-raise-try-except-and-unchecked-result-extraction-for">

- <level>MUST</level> avoid authored `raise`, `try`/`except`, and unchecked Result extraction for branching. <enforcement>[review]</enforcement>

</rule>

<rule id="use-result-map-for-successful-pure-transforms-and-bind">

- <level>MUST</level> use Result `map` for successful pure transforms and `bind` for fallible transforms. <enforcement>[review]</enforcement>

</rule>

<rule id="avoid-conditional-expressions-and-deeply-nested-branches-around-successful">

- <level>MUST</level> avoid conditional expressions and deeply nested branches around successful paths. <enforcement>[review]</enforcement>

</rule>

<rule id="configure-and-verify-exhaustiveness-checks-rather-than-assume-python">

- <level>MUST</level> configure and verify exhaustiveness checks rather than assume Python match statements are exhaustive. <enforcement>[review]</enforcement>

</rule>

<rule id="keep-assertions-for-tests-rather-than-runtime-input-validation">

- <level>MUST</level> keep assertions for tests rather than runtime input validation. <enforcement>[review]</enforcement>

</rule>

</rules>

<examples>

</examples>

<enforcement>

[review]

Syntax checks can reject exception-control-flow nodes. Strict typing and review establish variant handling; Python alone does not enforce exhaustive matching.

</enforcement>

</standard>

## Enforcement

Syntax checks can reject exception-control-flow nodes. Strict typing and review establish variant handling; Python alone does not enforce exhaustive matching.
