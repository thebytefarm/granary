---
title: Naming
description: 'Use Rust casing conventions and name concrete operations and domain values.'
---

# Naming

Name what an operation does and what a value represents.

## Conventions

### Why

Native casing makes declarations predictable to Rust readers and tools.

### Rules

- MUST use snake_case for modules, files, functions, and values.
- MUST use PascalCase for structs, enums, traits, and type parameters.
- MUST use SCREAMING_SNAKE_CASE for constants.
- MUST give predicates an `is_`, `has_`, `can_`, or `should_` prefix when appropriate.
- MUST choose concrete operation verbs rather than vague utility names.
- SHOULD let the owning module supply context instead of repeating its name in every declaration.

## Enforcement

Compiler naming warnings and configured Clippy rules cover casing. Review checks domain precision.
