---
title: Standards authoring
description: 'Write normative rules with reasons, focused examples, and an honest account of automated and manual enforcement.'
---

# Standards authoring

A standard is an actionable contract for authors and reviewers. Its examples and enforcement notes should make compliance assessable.

## Rule construction

### Why

“Keep diagrams readable” does not tell an author which conventions to apply. A standard needs both the concrete instruction and the reason a future edit should retain it.

### Rules

- MUST give each rule section a Why rationale and a Rules list.
- MUST use the pack's RFC 2119 terms and end normative bullets with periods.
- MUST keep a rule focused on one independently assessable requirement.
- MUST put repository-specific permissions and release choices in operating instructions rather than portable standards.
- MUST preserve required public/library contracts when prescribing a coding pattern.
- MUST include a focused valid example when the rule is not self-evident.
- MUST document Enforcement, distinguishing tool checks from human review.
- MUST avoid claiming that lint enforces a convention when the configured rules do not enforce it.
- SHOULD use a good/bad comparison only when the difference is consequential and can be explained briefly.

## Example rule

```md
## Entry selection

### Why

An installed pack needs a reading entrypoint. A metadata-only check cannot establish that the selected files contain it.

### Rules

- MUST include the declared entrypoint in selected content.

### Example

Selecting START.md while declaring START.md as the entrypoint satisfies the rule.

## Enforcement

The installer rejects an excluded entrypoint; behavior tests exercise that contract.
```

## Review checklist

Check the rule against a real operation, verify the example, and identify the exact tool or reviewer that can detect a violation. Register the page in the pack README and regenerate the consumer's routing index.

## Enforcement

Component-content tests check standard metadata and Why, Rules, and Enforcement headings. Review establishes rule semantics, example correctness, portability, and the accuracy of enforcement claims.

See [Writing](writing.md) and [Formatting](formatting.md). Language-specific API comments belong to the selected language pack.
