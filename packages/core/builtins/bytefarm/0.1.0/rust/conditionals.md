---
title: Conditionals
description: 'Use early guards for rejection and exhaustive matches for Rust domain variants.'
---

# Conditionals

Keep successful paths readable and make closed alternatives explicit.

<standard id="conditionals-branching">

## Branching

<why>

### Why

An exhaustive match makes a newly added enum variant visible to callers at compile time.

</why>

<rules>

### Rules

<rule id="return-early-from-invalid-preconditions">

- <level>MUST</level> return early from invalid preconditions. <enforcement>[review]</enforcement>

</rule>

<rule id="match-closed-domain-enums-exhaustively">

- <level>MUST</level> match closed domain enums exhaustively. <enforcement>[review]</enforcement>

</rule>

<rule id="avoid-wildcard-arms-that-hide-an-unhandled-repository-owned-enum">

- <level>MUST</level> avoid wildcard arms that hide an unhandled repository-owned enum variant. <enforcement>[review]</enforcement>

</rule>

<rule id="use-if-let-for-a-genuinely-partial-match-and">

- <level>MUST</level> use `if let` for a genuinely partial match and `match` when every alternative matters. <enforcement>[review]</enforcement>

</rule>

<rule id="consume-the-narrowed-variant-rather-than-recover-it-with">

- <level>MUST</level> consume the narrowed variant rather than recover it with unchecked extraction. <enforcement>[review]</enforcement>

</rule>

<rule id="avoid-nested-conditionals-around-the-successful-operation">

- <level>MUST</level> avoid nested conditionals around the successful operation. <enforcement>[review]</enforcement>

</rule>

</rules>

<examples>

</examples>

<enforcement>

[review]

The compiler establishes exhaustive matching. Review distinguishes deliberate partial handling from missing cases.

</enforcement>

</standard>

## Enforcement

The compiler establishes exhaustive matching. Review distinguishes deliberate partial handling from missing cases.
