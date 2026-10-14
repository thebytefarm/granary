---
title: Dependencies
description: 'Evaluate capability, typing, maintenance, and licensing before expanding the dependency vocabulary.'
---

# Dependencies

Use the language's native capabilities and the installed toolkit before adding another library.

## Selection

### Why

Two overlapping libraries create two contracts to maintain. A dependency should fill a demonstrated gap.

### Rules

- MUST identify the capability missing from native APIs and existing dependencies.
- MUST inspect current upstream documentation, licensing, supported runtimes, and typing support.
- MUST record maintenance evidence, including the latest release date and known limitations.
- MUST obtain any approval required by the consuming repository's operating instructions.
- MUST resolve the current release at installation time unless a specific version is requested.
- MUST record a reproducible version and lock resolution.
- MUST distinguish a pack's library recommendation from permission to install it.
- SHOULD prefer one vocabulary for a capability over overlapping general-purpose toolkits.

## Enforcement

Lockfiles establish reproducible resolutions. Review checks selection evidence and the consumer's approval requirements.
