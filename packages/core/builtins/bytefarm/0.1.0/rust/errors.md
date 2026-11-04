---
title: Errors
description: 'Return typed Rust Results and propagate expected failures without panics or unchecked extraction.'
---

# Errors

Use native Result for recoverable failures and `?` for propagation.

<standard id="errors-typed-outcomes">

## Typed outcomes

<why>

### Why

Invalid user input is an expected outcome. A panic hides that contract and can terminate unrelated work.

</why>

<rules>

### Rules

<rule id="return-result-content-failure-for-fallible-domain-operations">

- <level>MUST</level> return `Result<Content, Failure>` for fallible domain operations. <enforcement>[review]</enforcement>

</rule>

<rule id="classify-failures-with-enums-or-another-typed-contract">

- <level>MUST</level> classify failures with enums or another typed contract. <enforcement>[review]</enforcement>

</rule>

<rule id="propagate-results-with-matching-or-result-combinators">

- <level>MUST</level> propagate Results with `?`, matching, or Result combinators. <enforcement>[review]</enforcement>

</rule>

<rule id="keep-authored-panic-unwrap-expect-todo-and-unimplemented-out">

- <level>MUST</level> keep authored `panic!`, `unwrap`, `expect`, `todo!`, and `unimplemented!` out of production application paths. <enforcement>[review]</enforcement>

</rule>

<rule id="preserve-contextual-causes-at-resource-boundaries">

- <level>MUST</level> preserve contextual causes at resource boundaries. <enforcement>[review]</enforcement>

</rule>

<rule id="avoid-using-catch-unwind-as-recoverable-application-control-flow">

- <level>MUST</level> avoid using `catch_unwind` as recoverable application control flow. <enforcement>[review]</enforcement>

</rule>

<rule id="treat-ordinary-external-failures-through-the-external-api-s-result">

- <level>MUST</level> treat ordinary external failures through the external API's Result contract. <enforcement>[review]</enforcement>

</rule>

<rule id="use-assertions-and-unchecked-fixture-extraction-in-tests-when">

- <level>MAY</level> use assertions and unchecked fixture extraction in tests when failure should fail that test. <enforcement>[review]</enforcement>

</rule>

</rules>

<examples>

## Example

```rust
#[derive(Debug, PartialEq)]
pub enum PortFailure {
    InvalidPort,
}

pub fn parse_port(text: &str) -> Result<u16, PortFailure> {
    let port = text.parse::<u16>().map_err(|_| PortFailure::InvalidPort)?;
    if port == 0 {
        return Err(PortFailure::InvalidPort);
    }
    Ok(port)
}

#[test]
fn rejects_invalid_ports_as_values() {
    assert_eq!(parse_port("443"), Ok(443));
    assert_eq!(parse_port("0"), Err(PortFailure::InvalidPort));
    assert_eq!(parse_port("bad"), Err(PortFailure::InvalidPort));
}
```

</examples>

<enforcement>

[review]

Failure-path tests establish the return contract. Configure Clippy restrictions for panics and unchecked extraction; the compiler alone does not ban them.

</enforcement>

</standard>

## Enforcement

Failure-path tests establish the return contract. Configure Clippy restrictions for panics and unchecked extraction; the compiler alone does not ban them.
