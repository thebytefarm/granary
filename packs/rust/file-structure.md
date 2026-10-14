---
title: File structure
description: 'Organize Rust modules by owning capability and keep public crate exports deliberate.'
---

# File structure

Assign code to the narrowest capability that owns it.

## Crates and modules

### Why

Domain logic should not need a binary's terminal presentation to inspect a value.

### Rules

- MUST separate reusable library behavior from binary presentation and resource adapters.
- MUST use Cargo workspaces when the repository owns multiple related crates.
- MUST keep `lib.rs` and `main.rs` entrypoints small and deliberate.
- MUST expose only the supported public surface; prefer private or `pub(crate)` items internally.
- MUST name modules for domain responsibilities rather than catch-all helpers.
- MUST use explicit imports and re-exports rather than wildcard API surfaces.
- MUST keep tests beside their capability or in the owning crate's integration tests.

## Enforcement

Cargo and the compiler validate module boundaries. Review checks ownership, public visibility, and entrypoint scope.
