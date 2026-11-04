---
title: File structure
description: 'Organize Rust modules by owning capability and keep public crate exports deliberate.'
---

# File structure

Assign code to the narrowest capability that owns it.

<standard id="file-structure-crates-and-modules">

## Crates and modules

<why>

### Why

Domain logic should not need a binary's terminal presentation to inspect a value.

</why>

<rules>

### Rules

<rule id="separate-reusable-library-behavior-from-binary-presentation-and-resource">

- <level>MUST</level> separate reusable library behavior from binary presentation and resource adapters. <enforcement>[review]</enforcement>

</rule>

<rule id="use-cargo-workspaces-when-the-repository-owns-multiple-related">

- <level>MUST</level> use Cargo workspaces when the repository owns multiple related crates. <enforcement>[review]</enforcement>

</rule>

<rule id="keep-lib-rs-and-main-rs-entrypoints-small-and-deliberate">

- <level>MUST</level> keep `lib.rs` and `main.rs` entrypoints small and deliberate. <enforcement>[review]</enforcement>

</rule>

<rule id="expose-only-the-supported-public-surface-prefer-private-or">

- <level>MUST</level> expose only the supported public surface; prefer private or `pub(crate)` items internally. <enforcement>[review]</enforcement>

</rule>

<rule id="name-modules-for-domain-responsibilities-rather-than-catch-all-helpers">

- <level>MUST</level> name modules for domain responsibilities rather than catch-all helpers. <enforcement>[review]</enforcement>

</rule>

<rule id="use-explicit-imports-and-re-exports-rather-than-wildcard-api">

- <level>MUST</level> use explicit imports and re-exports rather than wildcard API surfaces. <enforcement>[review]</enforcement>

</rule>

<rule id="keep-tests-beside-their-capability-or-in-the-owning">

- <level>MUST</level> keep tests beside their capability or in the owning crate's integration tests. <enforcement>[review]</enforcement>

</rule>

</rules>

<examples>

</examples>

<enforcement>

[review]

Cargo and the compiler validate module boundaries. Review checks ownership, public visibility, and entrypoint scope.

</enforcement>

</standard>

## Enforcement

Cargo and the compiler validate module boundaries. Review checks ownership, public visibility, and entrypoint scope.
