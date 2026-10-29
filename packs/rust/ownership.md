---
title: Ownership
description: 'Borrow inputs, produce new domain values, and avoid clones or interior mutation that hide ownership.'
---

# Ownership

Let the signature express who owns the value and how long it is needed.

<standard id="ownership-borrowing-and-state">

## Borrowing and state

<why>

### Why

Cloning a value to escape an ownership error can obscure the relationship the compiler is asking you to model.

</why>

<rules>

### Rules

<rule id="borrow-read-only-inputs-when-ownership-is-unnecessary">

- <level>MUST</level> borrow read-only inputs when ownership is unnecessary. <enforcement>[review]</enforcement>

</rule>

<rule id="return-a-new-value-for-a-domain-state-transition">

- <level>MUST</level> return a new value for a domain state transition rather than mutate the caller's value. <enforcement>[review]</enforcement>

</rule>

<rule id="avoid-shared-mutable-domain-state-through-refcell-locks-or">

- <level>MUST</level> avoid shared mutable domain state through `RefCell`, locks, or atomics merely for convenience. <enforcement>[review]</enforcement>

</rule>

<rule id="justify-clones-with-a-real-ownership-or-lifetime-requirement">

- <level>MUST</level> justify clones with a real ownership or lifetime requirement. <enforcement>[review]</enforcement>

</rule>

<rule id="keep-mutable-handles-and-synchronization-for-external-resources-in">

- <level>MUST</level> keep mutable handles and synchronization for external resources in their owning adapters. <enforcement>[review]</enforcement>

</rule>

<rule id="prefer-owned-outputs-over-references-to-local-temporaries">

- <level>MUST</level> prefer owned outputs over references to local temporaries. <enforcement>[review]</enforcement>

</rule>

<rule id="choose-a-collection-from-its-semantics-without-copying-typescript-specific">

- <level>MUST</level> choose a collection from its semantics without copying TypeScript-specific collection bans into Rust. <enforcement>[review]</enforcement>

</rule>

</rules>

<examples>

</examples>

<enforcement>

[review]

The borrow checker establishes memory ownership constraints. Review checks deliberate clones, interior mutation, and domain/resource separation.

</enforcement>

</standard>

## Enforcement

The borrow checker establishes memory ownership constraints. Review checks deliberate clones, interior mutation, and domain/resource separation.
