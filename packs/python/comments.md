---
title: Comments
description: 'Document Python caller-facing constraints, typed failure variants, and resource effects.'
---

# Comments

Document the behavior a caller cannot learn from annotations alone.

<standard id="comments-public-contracts">

## Public contracts

<why>

### Why

A Result annotation does not explain which failure literal is returned or whether the operation reads an external resource.

</why>

<rules>

### Rules

<rule id="document-consequential-public-functions-and-capabilities-with-docstrings">

- <level>MUST</level> document consequential public functions and capabilities with docstrings. <enforcement>[review]</enforcement>

</rule>

<rule id="describe-input-constraints-return-behavior-effects-and-failure-variants">

- <level>MUST</level> describe input constraints, return behavior, effects, and failure variants. <enforcement>[review]</enforcement>

</rule>

<rule id="describe-typed-failure-values-rather-than-invent-a-raises">

- <level>MUST</level> describe typed failure values rather than invent a Raises contract for an exception-free domain function. <enforcement>[review]</enforcement>

</rule>

<rule id="explain-any-external-exceptions-converted-by-the-adapter">

- <level>MUST</level> explain any external exceptions converted by the adapter. <enforcement>[review]</enforcement>

</rule>

<rule id="provide-executable-examples-when-the-contract-needs-demonstration">

- <level>MUST</level> provide executable examples when the contract needs demonstration. <enforcement>[review]</enforcement>

</rule>

<rule id="avoid-comments-that-paraphrase-the-next-statement">

- <level>MUST</level> avoid comments that paraphrase the next statement. <enforcement>[review]</enforcement>

</rule>

<rule id="record-a-safety-reason-when-guarded-use-of-a">

- <level>MUST</level> record a safety reason when guarded use of a raising primitive is intended to be total. <enforcement>[review]</enforcement>

</rule>

</rules>

<examples>

</examples>

<enforcement>

[review]

Configured docstring checks cover syntax and style. Tests and review establish example validity and contract completeness.

</enforcement>

</standard>

## Enforcement

Configured docstring checks cover syntax and style. Tests and review establish example validity and contract completeness.
