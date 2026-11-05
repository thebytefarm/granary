---
title: Comments
description: 'Document Rust public contracts, failure cases, and borrow requirements with verifiable examples.'
---

# Comments

Use rustdoc for caller-facing behavior and ordinary comments for hidden rationale.

<standard id="comments-public-documentation">

## Public documentation

<why>

### Why

A Result signature does not enumerate which inputs fail or whether an operation performs I/O.

</why>

<rules>

### Rules

<rule id="document-public-items-whose-contract-is-not-evident-from">

- <level>MUST</level> document public items whose contract is not evident from their name and type. <enforcement>[review]</enforcement>

</rule>

<rule id="describe-input-constraints-ownership-effects-and-failure-behavior">

- <level>MUST</level> describe input constraints, ownership, effects, and failure behavior. <enforcement>[review]</enforcement>

</rule>

<rule id="include-an-errors-section-for-meaningful-failure-cases">

- <level>MUST</level> include an Errors section for meaningful failure cases. <enforcement>[review]</enforcement>

</rule>

<rule id="supply-runnable-rustdoc-examples-for-consequential-public-behavior">

- <level>MUST</level> supply runnable rustdoc examples for consequential public behavior. <enforcement>[review]</enforcement>

</rule>

<rule id="propagate-example-failures-with-result-instead-of-normalizing-unchecked">

- <level>MUST</level> propagate example failures with Result instead of normalizing unchecked extraction in application examples. <enforcement>[review]</enforcement>

</rule>

<rule id="explain-the-invariant-of-any-required-unsafe-code-at">

- <level>MUST</level> explain the invariant of any required unsafe code at its owning boundary. <enforcement>[review]</enforcement>

</rule>

<rule id="avoid-comments-that-restate-the-next-statement">

- <level>MUST</level> avoid comments that restate the next statement. <enforcement>[review]</enforcement>

</rule>

</rules>

<examples>

</examples>

<enforcement>

[review]

Cargo doctests verify configured public examples. Review checks contract completeness and safety rationale.

</enforcement>

</standard>

## Enforcement

Cargo doctests verify configured public examples. Review checks contract completeness and safety rationale.
