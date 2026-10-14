---
title: File structure
description: 'Assign modules to their owning capability and keep package entrypoints deliberate and shallow.'
---

# File structure

Choose a module's home from the behavior it owns and the callers that need it.

## Ownership and exports

### Why

An installer should not need terminal presentation code to inspect a source. Explicit entrypoints preserve that separation and reveal the supported package API.

### Rules

- MUST place shared code in the narrowest scope that contains its callers.
- MUST separate reusable domain behavior from application presentation and framework adapters.
- MUST cross a package boundary using its workspace name and declared exports.
- MUST enumerate a package or library entrypoint's exports by name.
- MUST avoid wildcard exports and chains of nested barrel modules.
- MUST reference sibling implementation files directly within a library, bypassing its public entrypoint.
- MUST export named declarations unless an actual tool or framework contract requires a default.
- MAY use defaults for configuration or autoloaded modules when the actual tool requires them.
- MUST keep manually registered commands named; autoload support alone does not require a default.
- MUST register application entrypoints explicitly unless an actual autoload contract is in use.

## File organization

### Why

A consistent file layout lets a reviewer find the contract before reading private implementation details. Domain filenames make responsibility clearer than a miscellaneous helper bucket.

### Rules

- MUST separate import groups in this order: Node builtins, external packages, workspace or path aliases, then relative files.
- MUST spell builtin imports with `node:` and type-only imports with `import type`.
- MUST use workspace names or configured aliases instead of deep relative paths across module boundaries.
- MAY use relative paths inside a module and for its adjacent config or metadata.
- MUST keep exported contract types near their functions and private declarations below the public API.
- MUST name modules for their responsibility rather than introducing a catch-all `helpers.ts`.
- SHOULD delegate formatting and configured import ordering to oxfmt.

## Enforcement

Package exports and typechecks establish supported module resolution. Formatting covers configured import ordering; review checks owning capability and public surface.
