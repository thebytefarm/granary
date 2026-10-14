---
title: Utilities
description: 'Use native Rust iterator and Result combinators before adding an extension crate.'
---

# Utilities

Start with standard-library iterators, Option, and Result.

## Composition

### Why

Native combinators already express mapping, filtering, and short-circuiting fallible collection without a utility runtime.

### Rules

- MUST inspect native `map`, `filter`, `filter_map`, `fold`, `try_fold`, and `collect` before writing generic helpers.
- MUST use `collect::<Result<_, _>>()` when a collection transform should stop on its first failure.
- MUST avoid `filter_map(Result::ok)` when discarding errors would change the contract.
- MUST keep iterator chains focused and name intermediate domain stages when needed.
- MUST bound concurrent resource work in the owning async adapter.
- MAY adopt itertools for missing iterator operations after the consumer's dependency approval.
- MUST avoid adding another Result abstraction merely to imitate massaman.

## Example

```rust
pub fn parse_counts(values: &[&str]) -> Result<Vec<u32>, std::num::ParseIntError> {
    values.iter().map(|value| value.parse::<u32>()).collect()
}

#[test]
fn preserves_collection_failures() {
    assert_eq!(parse_counts(&["2", "3"]).ok(), Some(vec![2, 3]));
    assert!(parse_counts(&["2", "bad", "3"]).is_err());
}
```

## Enforcement

The compiler and failure-path tests check Result collection. Review checks discarded errors, allocation decisions, and concurrency bounds.
