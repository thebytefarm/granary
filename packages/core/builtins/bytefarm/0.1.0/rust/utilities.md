---
title: Utilities
description: 'Use native Rust iterator and Result combinators before adding an extension crate.'
---

# Utilities

Start with standard-library iterators, Option, and Result.

<standard id="utilities-composition">

## Composition

<why>

### Why

Native combinators already express mapping, filtering, and short-circuiting fallible collection without a utility runtime.

</why>

<rules>

### Rules

<rule id="inspect-native-map-filter-filter-map-fold-try-fold-and-collect">

- <level>MUST</level> inspect native `map`, `filter`, `filter_map`, `fold`, `try_fold`, and `collect` before writing generic helpers. <enforcement>[review]</enforcement>

</rule>

<rule id="use-collect-result-when-a-collection-transform-should-stop">

- <level>MUST</level> use `collect::<Result<_, _>>()` when a collection transform should stop on its first failure. <enforcement>[review]</enforcement>

</rule>

<rule id="avoid-filter-map-result-ok-when-discarding-errors-would-change-the-contract">

- <level>MUST</level> avoid `filter_map(Result::ok)` when discarding errors would change the contract. <enforcement>[review]</enforcement>

</rule>

<rule id="keep-iterator-chains-focused-and-name-intermediate-domain-stages">

- <level>MUST</level> keep iterator chains focused and name intermediate domain stages when needed. <enforcement>[review]</enforcement>

</rule>

<rule id="bound-concurrent-resource-work-in-the-owning-async-adapter">

- <level>MUST</level> bound concurrent resource work in the owning async adapter. <enforcement>[review]</enforcement>

</rule>

<rule id="adopt-itertools-for-missing-iterator-operations-after-the-consumer-s">

- <level>MAY</level> adopt itertools for missing iterator operations after the consumer's dependency approval. <enforcement>[review]</enforcement>

</rule>

<rule id="avoid-adding-another-result-abstraction-merely-to-imitate-massaman">

- <level>MUST</level> avoid adding another Result abstraction merely to imitate massaman. <enforcement>[review]</enforcement>

</rule>

</rules>

<examples>

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

</examples>

<enforcement>

[review]

The compiler and failure-path tests check Result collection. Review checks discarded errors, allocation decisions, and concurrency bounds.

</enforcement>

</standard>

## Enforcement

The compiler and failure-path tests check Result collection. Review checks discarded errors, allocation decisions, and concurrency bounds.
