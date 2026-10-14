---
title: Types
description: 'Validate external Python values and model immutable domain alternatives with explicit typed contracts.'
---

# Types

Annotations describe a valid value; validation establishes whether an external value belongs to that type.

## Validated models

### Why

A type annotation does not validate decoded JSON or an external SDK response at runtime.

### Rules

- MUST receive untrusted values as `object` until runtime checks validate them.
- MUST avoid Any, unchecked casts, and type-ignore directives that bypass validation.
- MUST represent closed alternatives with typed unions, literals, or enums.
- MUST use frozen records with immutable fields for domain models.
- MUST distinguish absent values from failures that require an explanation.
- MUST use Protocols for injected capabilities when structural typing is needed.
- MUST retain explicit generic Result annotations so error types do not degrade into Any.
- MUST verify the returns decorator/composition types with its supported mypy plugin.

## Enforcement

Strict typechecks verify annotations and supported plugin inference. Boundary tests verify runtime validation.
