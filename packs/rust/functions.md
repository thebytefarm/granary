---
title: Functions
description: 'Declare focused Rust operations with explicit input ownership and return contracts.'
---

# Functions

Make required ownership and failure behavior visible in the signature.

<standard id="functions-contracts">

## Contracts

<why>

### Why

A borrowed string communicates that reading it does not require ownership of its allocation.

</why>

<rules>

### Rules

<rule id="use-named-fn-declarations-for-reusable-operations">

- <level>MUST</level> use named `fn` declarations for reusable operations. <enforcement>[review]</enforcement>

</rule>

<rule id="annotate-public-return-types-and-express-expected-failure-with">

- <level>MUST</level> annotate public return types and express expected failure with Result. <enforcement>[review]</enforcement>

</rule>

<rule id="accept-str-and-slices-when-ownership-is-not-required">

- <level>MUST</level> accept `&str` and slices when ownership is not required. <enforcement>[review]</enforcement>

</rule>

<rule id="take-owned-values-only-when-the-operation-retains-or">

- <level>MUST</level> take owned values only when the operation retains or consumes them. <enforcement>[review]</enforcement>

</rule>

<rule id="use-a-named-input-struct-when-several-parameters-form">

- <level>MUST</level> use a named input struct when several parameters form one domain request. <enforcement>[review]</enforcement>

</rule>

<rule id="keep-each-operation-focused-on-one-responsibility">

- <level>MUST</level> keep each operation focused on one responsibility. <enforcement>[review]</enforcement>

</rule>

<rule id="use-closures-as-iterator-callbacks-or-injected-capabilities">

- <level>MAY</level> use closures as iterator callbacks or injected capabilities. <enforcement>[review]</enforcement>

</rule>

</rules>

<examples>

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

</examples>

<enforcement>

[review]

The compiler and tests check signature use. Review checks ownership decisions and operation scope.

</enforcement>

</standard>

## Enforcement

The compiler and tests check signature use. Review checks ownership decisions and operation scope.
