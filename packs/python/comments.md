---
title: Comments
description: 'Document Python caller-facing constraints, typed failure variants, and resource effects.'
---

# Comments

Document the behavior a caller cannot learn from annotations alone.

## Public contracts

### Why

A Result annotation does not explain which failure literal is returned or whether the operation reads an external resource.

### Rules

- MUST document consequential public functions and capabilities with docstrings.
- MUST describe input constraints, return behavior, effects, and failure variants.
- MUST describe typed failure values rather than invent a Raises contract for an exception-free domain function.
- MUST explain any external exceptions converted by the adapter.
- MUST provide executable examples when the contract needs demonstration.
- MUST avoid comments that paraphrase the next statement.
- MUST record a safety reason when guarded use of a raising primitive is intended to be total.

## Enforcement

Configured docstring checks cover syntax and style. Tests and review establish example validity and contract completeness.
