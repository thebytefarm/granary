---
title: Errors
description: 'Return typed Python failures and adapt external exceptions without authored raise or try/except.'
---

# Errors

Use returns containers for predictable failure. Never author `raise` or `try`/`except` application control flow.

<standard id="errors-typed-outcomes">

## Typed outcomes

<why>

### Why

Invalid input should remain a value that callers can compose. Exceptions belong to the external API being adapted, not the domain workflow.

</why>

<rules>

### Rules

<rule id="construct-successful-and-failed-pure-outcomes-with-typed-success">

- <level>MUST</level> construct successful and failed pure outcomes with typed `Success` and `Failure` values <enforcement>[review]</enforcement>

</rule>

<rule id="classify-failures-with-typed-literals-or-immutable-variants-rather">

- <level>MUST</level> classify failures with typed literals or immutable variants rather than message text. <enforcement>[review]</enforcement>

</rule>

<rule id="propagate-results-through-bind-map-matching-or-validated-guards">

- <level>MUST</level> propagate Results through `bind`, `map`, matching, or validated guards. <enforcement>[review]</enforcement>

</rule>

<rule id="contain-exception-raising-primitives-and-third-party-operations-with-safe-impure-safe">

- <level>MUST</level> contain exception-raising primitives and third-party operations with `safe`, `impure_safe`, or `future_safe` in the owning adapter. <enforcement>[review]</enforcement>

</rule>

<rule id="avoid-decorating-an-entire-domain-workflow-merely-to-convert">

- <level>MUST</level> avoid decorating an entire domain workflow merely to convert hidden programming errors. <enforcement>[review]</enforcement>

</rule>

<rule id="avoid-unchecked-unwrap-and-failure-in-production-application-paths">

- <level>MUST</level> avoid unchecked `.unwrap()` and `.failure()` in production application paths. <enforcement>[review]</enforcement>

</rule>

<rule id="avoid-custom-exception-subclasses-used-as-authored-control-flow">

- <level>MUST</level> avoid custom Exception subclasses used as authored control flow. <enforcement>[review]</enforcement>

</rule>

<rule id="keep-cancellation-keyboardinterrupt-and-process-termination-outside-the-recoverable">

- <level>MUST</level> keep cancellation, KeyboardInterrupt, and process termination outside the recoverable failure model. <enforcement>[review]</enforcement>

</rule>

</rules>

<examples>

## Example

This complete example requires returns in the consumer environment. Its guards establish that integer conversion is bounded ASCII decimal input.

```python
from typing import Literal

from returns.result import Failure, Result, Success

PortFailure = Literal["invalid-port"]


def parse_port(text: str) -> Result[int, PortFailure]:
    if not text.isascii() or not text.isdecimal() or len(text) > 5:
        return Failure("invalid-port")
    port = int(text)
    if not 1 <= port <= 65535:
        return Failure("invalid-port")
    return Success(port)


assert parse_port("443") == Success(443)
assert parse_port("0") == Failure("invalid-port")
assert parse_port("bad") == Failure("invalid-port")
assert parse_port("9" * 5000) == Failure("invalid-port")
```

</examples>

<enforcement>

[review]

AST checks reject authored raise/try syntax. Failure-path tests and strict typing with the returns plugin verify container behavior and propagation.

</enforcement>

</standard>

## Enforcement

AST checks reject authored raise/try syntax. Failure-path tests and strict typing with the returns plugin verify container behavior and propagation.
