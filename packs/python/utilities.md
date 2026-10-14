---
title: Utilities
description: 'Use returns for typed composition and native Python iterators for straightforward transformations.'
---

# Utilities

Use one typed failure vocabulary and the standard library's ordinary transforms.

## Composition and reuse

### Why

Untyped composition can obscure a pipeline's failure contract even when each individual function is annotated.

### Rules

- MUST use returns `map` for pure successful-value transforms and `bind` for Result-returning stages.
- MUST inspect returns `flow` and `pipe` before writing a generic composition helper.
- MUST use standard-library iterators, comprehensions, itertools, and functools when they express the transformation clearly.
- MUST preserve failure types across composition rather than weaken them to Any.
- MUST prefer explicit injected dependencies before introducing context containers.
- MUST bound asynchronous resource concurrency and preserve cancellation.
- MAY adopt Toolz for a demonstrated collection gap after maintenance and strict-typing checks.
- MUST keep library installation subject to the consumer's approval rules.

## Example

This complete example requires returns in the consumer environment.

```python
from typing import Literal

from returns.result import Failure, Result, Success

CountFailure = Literal["negative-count"]


def require_nonnegative(value: int) -> Result[int, CountFailure]:
    if value < 0:
        return Failure("negative-count")
    return Success(value)


def describe_count(value: int) -> Result[str, CountFailure]:
    return require_nonnegative(value).map(lambda count: f"{count} files")


assert describe_count(2) == Success("2 files")
assert describe_count(-1) == Failure("negative-count")
```

## Enforcement

Strict typing with the returns plugin and behavioral tests establish pipeline contracts. Review checks generic helper duplication and concurrency limits.
