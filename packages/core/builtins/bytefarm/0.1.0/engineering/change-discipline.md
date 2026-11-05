---
title: Change discipline
description: 'Tie each edited line to an observable outcome and preserve unrelated behavior.'
---

# Change discipline

Define the outcome before editing. Keep the patch understandable and reversible.

<standard id="change-discipline-scope-and-preservation">

## Scope and preservation

<why>

### Why

A selection fix should not also replace a source adapter. Focused changes make regressions attributable to one behavior.

</why>

<rules>

### Rules

<rule id="connect-changed-code-to-the-requested-outcome">

- <level>MUST</level> connect changed code to the requested outcome. <enforcement>[review]</enforcement>

</rule>

<rule id="inspect-existing-work-before-replacing-it">

- <level>MUST</level> inspect existing work before replacing it. <enforcement>[review]</enforcement>

</rule>

<rule id="preserve-unrelated-behavior-names-and-formatting">

- <level>MUST</level> preserve unrelated behavior, names, and formatting. <enforcement>[review]</enforcement>

</rule>

<rule id="separate-policy-changes-enforcement-changes-and-source-migrations-into">

- <level>MUST</level> separate policy changes, enforcement changes, and source migrations into reviewable stages. <enforcement>[review]</enforcement>

</rule>

<rule id="record-incidental-findings-as-follow-up-work-unless-the-requested">

- <level>MUST</level> record incidental findings as follow-up work unless the requested scope includes them. <enforcement>[review]</enforcement>

</rule>

<rule id="apply-the-governing-standards-to-new-code-without-treating">

- <level>MUST</level> apply the governing standards to new code without treating older code as permission to repeat a violation. <enforcement>[review]</enforcement>

</rule>

</rules>

<examples>

</examples>

<enforcement>

[review]

Review establishes scope and behavior preservation. Behavioral tests verify the contracts affected by the change.

</enforcement>

</standard>

## Enforcement

Review establishes scope and behavior preservation. Behavioral tests verify the contracts affected by the change.
