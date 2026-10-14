---
title: Ownership
description: 'Borrow inputs, produce new domain values, and avoid clones or interior mutation that hide ownership.'
---

# Ownership

Let the signature express who owns the value and how long it is needed.

## Borrowing and state

### Why

Cloning a value to escape an ownership error can obscure the relationship the compiler is asking you to model.

### Rules

- MUST borrow read-only inputs when ownership is unnecessary.
- MUST return a new value for a domain state transition rather than mutate the caller's value.
- MUST avoid shared mutable domain state through `RefCell`, locks, or atomics merely for convenience.
- MUST justify clones with a real ownership or lifetime requirement.
- MUST keep mutable handles and synchronization for external resources in their owning adapters.
- MUST prefer owned outputs over references to local temporaries.
- MUST choose a collection from its semantics without copying TypeScript-specific collection bans into Rust.

## Enforcement

The borrow checker establishes memory ownership constraints. Review checks deliberate clones, interior mutation, and domain/resource separation.
