---
title: Errors
description: 'Return typed Rust Results and propagate expected failures without panics or unchecked extraction.'
---

# Errors

Use native Result for recoverable failures and `?` for propagation.

## Typed outcomes

### Why

Invalid user input is an expected outcome. A panic hides that contract and can terminate unrelated work.

### Rules

- MUST return `Result<Content, Failure>` for fallible domain operations.
- MUST classify failures with enums or another typed contract.
- MUST propagate Results with `?`, matching, or Result combinators.
- MUST keep authored `panic!`, `unwrap`, `expect`, `todo!`, and `unimplemented!` out of production application paths.
- MUST preserve contextual causes at resource boundaries.
- MUST avoid using `catch_unwind` as recoverable application control flow.
- MUST treat ordinary external failures through the external API's Result contract.
- MAY use assertions and unchecked fixture extraction in tests when failure should fail that test.

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

## Enforcement

Failure-path tests establish the return contract. Configure Clippy restrictions for panics and unchecked extraction; the compiler alone does not ban them.
