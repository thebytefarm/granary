---
title: Agent instructions
description: 'Keep operating instructions short and route detailed rules to canonical reference material.'
---

# Agent instructions

Describe how to operate this repository, then point to the rules needed for each task.

<standard id="instructions-operating-contract">

## Operating contract

<why>

### Why

A root instruction file should not repeat every language rule. Canonical references let agents retrieve the relevant material without contradictory copies.

</why>

<rules>

### Rules

<rule id="provide-the-consumer-s-commands-and-permission-boundaries">

- <level>MUST</level> provide the consumer's commands and permission boundaries. <enforcement>[review]</enforcement>

</rule>

<rule id="distinguish-always-ask-first-and-never-requirements">

- <level>MUST</level> distinguish Always, Ask first, and Never requirements. <enforcement>[review]</enforcement>

</rule>

<rule id="keep-repository-specific-credentials-release-authorization-and-runtime-procedures-out">

- <level>MUST</level> keep repository-specific credentials, release authorization, and runtime procedures out of reusable packs. <enforcement>[review]</enforcement>

</rule>

<rule id="require-reading-the-applicable-standard-before-an-edit">

- <level>MUST</level> require reading the applicable standard before an edit. <enforcement>[review]</enforcement>

</rule>

<rule id="route-detailed-topics-to-their-canonical-component-pages">

- <level>MUST</level> route detailed topics to their canonical component pages. <enforcement>[review]</enforcement>

</rule>

<rule id="preserve-generated-regions-and-their-exact-delimiters">

- <level>MUST</level> preserve generated regions and their exact delimiters. <enforcement>[review]</enforcement>

</rule>

<rule id="reserve-nested-instruction-files-for-scope-specific-differences">

- <level>MUST</level> reserve nested instruction files for scope-specific differences. <enforcement>[review]</enforcement>

</rule>

<rule id="keep-hand-authored-root-instructions-below-200-lines">

- <level>SHOULD</level> keep hand-authored root instructions below 200 lines. <enforcement>[review]</enforcement>

</rule>

</rules>

<examples>

</examples>

<enforcement>

[review]

Generators can check managed-region drift. Review checks authority, length, scope, and accurate operating commands.

</enforcement>

</standard>

## Enforcement

Generators can check managed-region drift. Review checks authority, length, scope, and accurate operating commands.
