---
title: State
description: 'Produce new Python domain values and prevent mutation hidden inside frozen records.'
---

# State

Keep domain values immutable through their complete object graph.

## Ownership

### Why

A frozen dataclass containing a mutable list still allows another caller to change that list.

### Rules

- MUST use tuples, frozensets, or validated immutable records for retained domain collections.
- MUST use immutable fields inside frozen records.
- MUST return a new value for domain state transitions.
- MUST avoid mutating input lists, dictionaries, or caller-owned objects.
- MUST keep application state out of module globals and captured mutable closures.
- MUST avoid reassigning existing domain bindings; use Final where the checker can establish the rule.
- MUST keep mutable external handles in resource adapters.
- MAY use declarative frozen dataclasses to define data rather than mutable application services.

## Example

```python
from dataclasses import dataclass, replace


@dataclass(frozen=True)
class Selection:
    names: tuple[str, ...]


def append_name(*, selection: Selection, name: str) -> Selection:
    return replace(selection, names=(*selection.names, name))


original = Selection(("docs",))
updated = append_name(selection=original, name="code")
assert original.names == ("docs",)
assert updated.names == ("docs", "code")
```

## Enforcement

Frozen data definitions and configured typing cover some mutation paths. Tests and review check nested fields, aliases, and state transitions.
