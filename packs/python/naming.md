---
title: Naming
description: 'Use native Python casing and name concrete domain operations and values.'
---

# Naming

Name the operation and its domain value clearly.

## Conventions

### Why

Predictable casing and explicit verbs make modules easier to navigate without a framework's conventions.

### Rules

- MUST use snake_case for files, modules, functions, and ordinary values.
- MUST use PascalCase for named data types, enums, and protocols.
- MUST use SCREAMING_SNAKE_CASE for constants.
- MUST give predicates an `is_`, `has_`, `can_`, or `should_` prefix when appropriate.
- MUST prefix module-private declarations with an underscore.
- MUST name modules for their owning capability rather than a generic helpers bucket.
- MUST avoid abbreviations that obscure the domain meaning.

## Enforcement

Configured lint rules check their supported conventions. Review checks operation precision and scope.
