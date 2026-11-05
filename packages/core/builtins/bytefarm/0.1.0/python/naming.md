---
title: Naming
description: 'Use native Python casing and name concrete domain operations and values.'
---

# Naming

Name the operation and its domain value clearly.

<standard id="naming-conventions">

## Conventions

<why>

### Why

Predictable casing and explicit verbs make modules easier to navigate without a framework's conventions.

</why>

<rules>

### Rules

<rule id="use-snake-case-for-files-modules-functions-and-ordinary-values">

- <level>MUST</level> use snake_case for files, modules, functions, and ordinary values. <enforcement>[review]</enforcement>

</rule>

<rule id="use-pascalcase-for-named-data-types-enums-and-protocols">

- <level>MUST</level> use PascalCase for named data types, enums, and protocols. <enforcement>[review]</enforcement>

</rule>

<rule id="use-screaming-snake-case-for-constants">

- <level>MUST</level> use SCREAMING_SNAKE_CASE for constants. <enforcement>[review]</enforcement>

</rule>

<rule id="give-predicates-an-is-has-can-or-should-prefix">

- <level>MUST</level> give predicates an `is_`, `has_`, `can_`, or `should_` prefix when appropriate. <enforcement>[review]</enforcement>

</rule>

<rule id="prefix-module-private-declarations-with-an-underscore">

- <level>MUST</level> prefix module-private declarations with an underscore. <enforcement>[review]</enforcement>

</rule>

<rule id="name-modules-for-their-owning-capability-rather-than-a">

- <level>MUST</level> name modules for their owning capability rather than a generic helpers bucket. <enforcement>[review]</enforcement>

</rule>

<rule id="avoid-abbreviations-that-obscure-the-domain-meaning">

- <level>MUST</level> avoid abbreviations that obscure the domain meaning. <enforcement>[review]</enforcement>

</rule>

</rules>

<examples>

</examples>

<enforcement>

[review]

Configured lint rules check their supported conventions. Review checks operation precision and scope.

</enforcement>

</standard>

## Enforcement

Configured lint rules check their supported conventions. Review checks operation precision and scope.
