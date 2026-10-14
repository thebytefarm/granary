---
title: Functions
description: 'Declare focused Rust operations with explicit input ownership and return contracts.'
---

# Functions

Make required ownership and failure behavior visible in the signature.

## Contracts

### Why

A borrowed string communicates that reading it does not require ownership of its allocation.

### Rules

- MUST use named `fn` declarations for reusable operations.
- MUST annotate public return types and express expected failure with Result.
- MUST accept `&str` and slices when ownership is not required.
- MUST take owned values only when the operation retains or consumes them.
- MUST use a named input struct when several parameters form one domain request.
- MUST keep each operation focused on one responsibility.
- MAY use closures as iterator callbacks or injected capabilities.

## Example

```rust
pub fn total_lengths(names: &[&str]) -> usize {
    names.iter().map(|name| name.len()).sum()
}

#[test]
fn counts_borrowed_names() {
    assert_eq!(total_lengths(&["docs", "code"]), 8);
}
```

## Enforcement

The compiler and tests check signature use. Review checks ownership decisions and operation scope.
