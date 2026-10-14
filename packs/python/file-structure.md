---
title: File structure
description: 'Keep Python domain modules independent of presentation, runtime wiring, and resource adapters.'
---

# File structure

Place behavior in the smallest module that owns its callers and contract.

## Module boundaries

### Why

Importing a domain module should not initialize a client or execute a command.

### Rules

- MUST separate pure domain transformations, resource adapters, and application entrypoints.
- MUST avoid import-time I/O and mutable application globals.
- MUST use explicit imports and avoid wildcard re-export chains.
- MUST keep `__init__.py` focused on a deliberate public surface.
- MUST keep executable entrypoints thin and coordinate effects there.
- MUST place tests beside their capability or in a corresponding test directory.
- MUST use the consumer's established package and environment layout.

## Enforcement

Import tests expose initialization effects. Lint and typechecks cover configured imports; review establishes module ownership.
