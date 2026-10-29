---
title: Standards authoring
description: 'Write normative rules with reasons, focused examples, and an honest account of automated and manual enforcement.'
---

# Standards authoring

A standard is an actionable contract for authors and reviewers. Its examples and enforcement notes should make compliance assessable.

<standard id="standards-rule-construction">

## Rule construction

<why>

### Why

“Keep diagrams readable” does not tell an author which conventions to apply. A standard needs both the concrete instruction and the reason a future edit should retain it.

</why>

<rules>

### Rules

<rule id="give-each-rule-section-a-why-rationale-and-a">

- <level>MUST</level> give each rule section a Why rationale and a Rules list. <enforcement>[review]</enforcement>

</rule>

<rule id="use-the-pack-s-rfc-2119-terms-and-end-normative">

- <level>MUST</level> use the pack's RFC 2119 terms and end normative bullets with periods. <enforcement>[review]</enforcement>

</rule>

<rule id="keep-a-rule-focused-on-one-independently-assessable-requirement">

- <level>MUST</level> keep a rule focused on one independently assessable requirement. <enforcement>[review]</enforcement>

</rule>

<rule id="put-repository-specific-permissions-and-release-choices-in-operating-instructions">

- <level>MUST</level> put repository-specific permissions and release choices in operating instructions rather than portable standards. <enforcement>[review]</enforcement>

</rule>

<rule id="preserve-required-public-library-contracts-when-prescribing-a-coding-pattern">

- <level>MUST</level> preserve required public/library contracts when prescribing a coding pattern. <enforcement>[review]</enforcement>

</rule>

<rule id="include-a-focused-valid-example-when-the-rule-is">

- <level>MUST</level> include a focused valid example when the rule is not self-evident. <enforcement>[review]</enforcement>

</rule>

<rule id="document-enforcement-distinguishing-tool-checks-from-human-review">

- <level>MUST</level> document Enforcement, distinguishing tool checks from human review. <enforcement>[review]</enforcement>

</rule>

<rule id="avoid-claiming-that-lint-enforces-a-convention-when-the">

- <level>MUST</level> avoid claiming that lint enforces a convention when the configured rules do not enforce it. <enforcement>[review]</enforcement>

</rule>

<rule id="use-a-good-bad-comparison-only-when-the-difference-is">

- <level>SHOULD</level> use a good/bad comparison only when the difference is consequential and can be explained briefly. <enforcement>[review]</enforcement>

</rule>

</rules>

<examples>

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

</examples>

<enforcement>

[review]

Component-content tests check standard metadata and Why, Rules, and Enforcement headings. Review establishes rule semantics, example correctness, portability, and the accuracy of enforcement claims.

See [Writing](writing.md) and [Formatting](formatting.md). Language-specific API comments belong to the selected language pack.

</enforcement>

</standard>

## Enforcement

Component-content tests check standard metadata and Why, Rules, and Enforcement headings. Review establishes rule semantics, example correctness, portability, and the accuracy of enforcement claims.

See [Writing](writing.md) and [Formatting](formatting.md). Language-specific API comments belong to the selected language pack.
