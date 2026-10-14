---
title: Change discipline
description: 'Tie each edited line to an observable outcome and preserve unrelated behavior.'
---

# Change discipline

Define the outcome before editing. Keep the patch understandable and reversible.

## Scope and preservation

### Why

A selection fix should not also replace a source adapter. Focused changes make regressions attributable to one behavior.

### Rules

- MUST connect changed code to the requested outcome.
- MUST inspect existing work before replacing it.
- MUST preserve unrelated behavior, names, and formatting.
- MUST separate policy changes, enforcement changes, and source migrations into reviewable stages.
- MUST record incidental findings as follow-up work unless the requested scope includes them.
- MUST apply the governing standards to new code without treating older code as permission to repeat a violation.

## Enforcement

Review establishes scope and behavior preservation. Behavioral tests verify the contracts affected by the change.
