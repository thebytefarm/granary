---
title: Context routing
description: 'Read selected preset components in order and apply each language’s rules only to its own files.'
---

# Context routing

Start from the installation index, then retrieve the pages that govern the current edit.

## Applicability

### Why

A polyglot repository may install Rust and Python references together. Installation order must not decide which language's rules apply.

### Rules

- MUST read shared engineering rules before language-specific mechanics.
- MUST use the preset's declared reading order.
- MUST apply a language component only to that language's source and examples.
- MUST use canonical component identities from the installation index instead of hard-coded links to another component version.
- MUST keep local Markdown links within a component's installed files.
- MUST surface conflicts with the consumer's governing instructions rather than silently merge incompatible requirements.
- MUST distinguish reference material from permission to execute its example commands.

## Enforcement

Installed-link tests check local closure. Review and the consuming agent establish task applicability and instruction authority.
