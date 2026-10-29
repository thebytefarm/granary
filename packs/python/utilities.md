---
title: Utilities
description: 'Use returns for typed composition and native Python iterators for straightforward transformations.'
---

# Utilities

Use one typed failure vocabulary and the standard library's ordinary transforms.

<standard id="utilities-composition-and-reuse">

## Composition and reuse

<why>

### Why

Untyped composition can obscure a pipeline's failure contract even when each individual function is annotated.

</why>

<rules>

### Rules

<rule id="use-returns-map-for-pure-successful-value-transforms-and-bind">

- <level>MUST</level> use returns `map` for pure successful-value transforms and `bind` for Result-returning stages. <enforcement>[review]</enforcement>

</rule>

<rule id="inspect-returns-flow-and-pipe-before-writing-a-generic">

- <level>MUST</level> inspect returns `flow` and `pipe` before writing a generic composition helper. <enforcement>[review]</enforcement>

</rule>

<rule id="use-standard-library-iterators-comprehensions-itertools-and-functools-when-they">

- <level>MUST</level> use standard-library iterators, comprehensions, itertools, and functools when they express the transformation clearly. <enforcement>[review]</enforcement>

</rule>

<rule id="preserve-failure-types-across-composition-rather-than-weaken-them">

- <level>MUST</level> preserve failure types across composition rather than weaken them to Any. <enforcement>[review]</enforcement>

</rule>

<rule id="prefer-explicit-injected-dependencies-before-introducing-context-containers">

- <level>MUST</level> prefer explicit injected dependencies before introducing context containers. <enforcement>[review]</enforcement>

</rule>

<rule id="bound-asynchronous-resource-concurrency-and-preserve-cancellation">

- <level>MUST</level> bound asynchronous resource concurrency and preserve cancellation. <enforcement>[review]</enforcement>

</rule>

<rule id="adopt-toolz-for-a-demonstrated-collection-gap-after-maintenance">

- <level>MAY</level> adopt Toolz for a demonstrated collection gap after maintenance and strict-typing checks. <enforcement>[review]</enforcement>

</rule>

<rule id="keep-library-installation-subject-to-the-consumer-s-approval-rules">

- <level>MUST</level> keep library installation subject to the consumer's approval rules. <enforcement>[review]</enforcement>

</rule>

</rules>

<examples>

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

</examples>

<enforcement>

[review]

Strict typing with the returns plugin and behavioral tests establish pipeline contracts. Review checks generic helper duplication and concurrency limits.

</enforcement>

</standard>

## Enforcement

Strict typing with the returns plugin and behavioral tests establish pipeline contracts. Review checks generic helper duplication and concurrency limits.
