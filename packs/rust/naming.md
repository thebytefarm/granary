---
title: Naming
description: 'Use Rust casing conventions and name concrete operations and domain values.'
---

# Naming

Name what an operation does and what a value represents.

<standard id="naming-conventions">

## Conventions

<why>

### Why

Native casing makes declarations predictable to Rust readers and tools.

</why>

<rules>

### Rules

<rule id="use-snake-case-for-modules-files-functions-and-values">

- <level>MUST</level> use snake_case for modules, files, functions, and values. <enforcement>[review]</enforcement>

</rule>

<rule id="use-pascalcase-for-structs-enums-traits-and-type-parameters">

- <level>MUST</level> use PascalCase for structs, enums, traits, and type parameters. <enforcement>[review]</enforcement>

</rule>

<rule id="use-screaming-snake-case-for-constants">

- <level>MUST</level> use SCREAMING_SNAKE_CASE for constants. <enforcement>[review]</enforcement>

</rule>

<rule id="give-predicates-an-is-has-can-or-should-prefix">

- <level>MUST</level> give predicates an `is_`, `has_`, `can_`, or `should_` prefix when appropriate. <enforcement>[review]</enforcement>

</rule>

<rule id="choose-concrete-operation-verbs-rather-than-vague-utility-names">

- <level>MUST</level> choose concrete operation verbs rather than vague utility names. <enforcement>[review]</enforcement>

</rule>

<rule id="let-the-owning-module-supply-context-instead-of-repeating">

- <level>SHOULD</level> let the owning module supply context instead of repeating its name in every declaration. <enforcement>[review]</enforcement>

</rule>

</rules>

<examples>

</examples>

<enforcement>

[review]

Compiler naming warnings and configured Clippy rules cover casing. Review checks domain precision.

</enforcement>

</standard>

## Enforcement

Compiler naming warnings and configured Clippy rules cover casing. Review checks domain precision.
