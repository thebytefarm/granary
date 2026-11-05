---
title: Paradigm
description: 'Build behavior from immutable functions, inject resources through factories, and isolate effects in adapters.'
---

# Paradigm

Authored TypeScript uses functions and immutable values. Resource access is a boundary capability, not a reason to introduce an application class hierarchy.

<standard id="paradigm-factories-and-composition">

## Factories and composition

<why>

### Why

A source reader should reveal which filesystem or Git capability it needs. A factory can provide that capability without attaching behavior to `this`.

</why>

<rules>

### Rules

<rule id="construct-reusable-resource-capabilities-with-factories-that-capture-injected">

- <level>MUST</level> construct reusable resource capabilities with factories that capture injected dependencies. <enforcement>[review]</enforcement>

</rule>

<rule id="assemble-behavior-by-combining-functions-and-plain-capabilities-rather">

- <level>MUST</level> assemble behavior by combining functions and plain capabilities rather than inheriting from application classes. <enforcement>[review]</enforcement>

</rule>

<rule id="exclude-authored-classes-class-expressions-custom-error-subclasses-class-dependent">

- <level>MUST</level> exclude authored classes, class expressions, custom Error subclasses, class-dependent decorators, and `this`-based application behavior. <enforcement>[review]</enforcement>

</rule>

<rule id="create-an-instance-required-by-a-third-party-library-inside">

- <level>MAY</level> create an instance required by a third-party library inside the adapter that owns it. <enforcement>[review]</enforcement>

</rule>

<rule id="wrap-required-third-party-inheritance-in-a-dedicated-adapter-when">

- <level>MAY</level> wrap required third-party inheritance in a dedicated adapter when that API leaves no alternative. <enforcement>[review]</enforcement>

</rule>

<rule id="prefer-a-collection-transform-or-named-function-over-an">

- <level>MUST</level> prefer a collection transform or named function over an equivalent loop or immediately invoked function. <enforcement>[review]</enforcement>

</rule>

</rules>

<examples>

</examples>

<enforcement>

[review]

Typechecks and configured lint rules establish their supported contracts. Tests and review verify effect isolation, capability ownership, and unconfigured syntax prohibitions.

</enforcement>

</standard>

<standard id="paradigm-pure-logic-and-effects">

## Pure logic and effects

<why>

### Why

Choosing a content group can be tested from values alone. Reading its files requires a resource adapter; mixing those jobs forces every selection test to account for I/O.

</why>

<rules>

### Rules

<rule id="keep-domain-transformations-independent-of-i-o-log-output-and">

- <level>MUST</level> keep domain transformations independent of I/O, log output, and clock access. <enforcement>[review]</enforcement>

</rule>

<rule id="place-effects-in-cli-handlers-or-the-resource-owning-adapter">

- <level>MUST</level> place effects in CLI handlers or the resource-owning adapter. <enforcement>[review]</enforcement>

</rule>

<rule id="supply-time-and-other-external-inputs-as-values-to">

- <level>MUST</level> supply time and other external inputs as values to the logic that needs them. <enforcement>[review]</enforcement>

</rule>

<rule id="declare-authored-bindings-with-const-without-later-reassignment">

- <level>MUST</level> declare authored bindings with `const`, without later reassignment. <enforcement>[review]</enforcement>

</rule>

</rules>

<examples>

Read [State](state.md) for ownership rules and [Errors](errors.md) for failure contracts.

</examples>

<enforcement>

[review]

Typechecks and configured lint rules establish their supported contracts. Tests and review verify effect isolation, capability ownership, and unconfigured syntax prohibitions.

</enforcement>

</standard>

## Enforcement

Typechecks and configured lint rules establish their supported contracts. Tests and review verify effect isolation, capability ownership, and unconfigured syntax prohibitions.
