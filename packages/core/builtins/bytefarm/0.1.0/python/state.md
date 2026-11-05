---
title: State
description: 'Produce new Python domain values and prevent mutation hidden inside frozen records.'
---

# State

Keep domain values immutable through their complete object graph.

<standard id="state-ownership">

## Ownership

<why>

### Why

A frozen dataclass containing a mutable list still allows another caller to change that list.

</why>

<rules>

### Rules

<rule id="use-tuples-frozensets-or-validated-immutable-records-for-retained">

- <level>MUST</level> use tuples, frozensets, or validated immutable records for retained domain collections. <enforcement>[review]</enforcement>

</rule>

<rule id="use-immutable-fields-inside-frozen-records">

- <level>MUST</level> use immutable fields inside frozen records. <enforcement>[review]</enforcement>

</rule>

<rule id="return-a-new-value-for-domain-state-transitions">

- <level>MUST</level> return a new value for domain state transitions. <enforcement>[review]</enforcement>

</rule>

<rule id="avoid-mutating-input-lists-dictionaries-or-caller-owned-objects">

- <level>MUST</level> avoid mutating input lists, dictionaries, or caller-owned objects. <enforcement>[review]</enforcement>

</rule>

<rule id="keep-application-state-out-of-module-globals-and-captured">

- <level>MUST</level> keep application state out of module globals and captured mutable closures. <enforcement>[review]</enforcement>

</rule>

<rule id="avoid-reassigning-existing-domain-bindings-use-final-where-the">

- <level>MUST</level> avoid reassigning existing domain bindings; use Final where the checker can establish the rule. <enforcement>[review]</enforcement>

</rule>

<rule id="keep-mutable-external-handles-in-resource-adapters">

- <level>MUST</level> keep mutable external handles in resource adapters. <enforcement>[review]</enforcement>

</rule>

<rule id="use-declarative-frozen-dataclasses-to-define-data-rather-than">

- <level>MAY</level> use declarative frozen dataclasses to define data rather than mutable application services. <enforcement>[review]</enforcement>

</rule>

</rules>

<examples>

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

</examples>

<enforcement>

[review]

Frozen data definitions and configured typing cover some mutation paths. Tests and review check nested fields, aliases, and state transitions.

</enforcement>

</standard>

## Enforcement

Frozen data definitions and configured typing cover some mutation paths. Tests and review check nested fields, aliases, and state transitions.
