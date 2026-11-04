---
title: Context routing
description: 'Read selected preset components in order and apply each language’s rules only to its own files.'
---

# Context routing

Start from the installation index, then retrieve the pages that govern the current edit.

<standard id="context-routing-applicability">

## Applicability

<why>

### Why

A polyglot repository may install Rust and Python references together. Installation order must not decide which language's rules apply.

</why>

<rules>

### Rules

<rule id="read-shared-engineering-rules-before-language-specific-mechanics">

- <level>MUST</level> read shared engineering rules before language-specific mechanics. <enforcement>[review]</enforcement>

</rule>

<rule id="use-the-preset-s-declared-reading-order">

- <level>MUST</level> use the preset's declared reading order. <enforcement>[review]</enforcement>

</rule>

<rule id="apply-a-language-component-only-to-that-language-s-source">

- <level>MUST</level> apply a language component only to that language's source and examples. <enforcement>[review]</enforcement>

</rule>

<rule id="use-canonical-component-identities-from-the-installation-index-instead">

- <level>MUST</level> use canonical component identities from the installation index instead of hard-coded links to another component version. <enforcement>[review]</enforcement>

</rule>

<rule id="keep-local-markdown-links-within-a-component-s-installed-files">

- <level>MUST</level> keep local Markdown links within a component's installed files. <enforcement>[review]</enforcement>

</rule>

<rule id="surface-conflicts-with-the-consumer-s-governing-instructions-rather-than">

- <level>MUST</level> surface conflicts with the consumer's governing instructions rather than silently merge incompatible requirements. <enforcement>[review]</enforcement>

</rule>

<rule id="distinguish-reference-material-from-permission-to-execute-its-example">

- <level>MUST</level> distinguish reference material from permission to execute its example commands. <enforcement>[review]</enforcement>

</rule>

</rules>

<examples>

</examples>

<enforcement>

[review]

Installed-link tests check local closure. Review and the consuming agent establish task applicability and instruction authority.

</enforcement>

</standard>

## Enforcement

Installed-link tests check local closure. Review and the consuming agent establish task applicability and instruction authority.
