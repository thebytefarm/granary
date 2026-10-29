---
title: State
description: 'Produce new values for state changes and keep mutable resource handles separate from installation data.'
---

# State

An update produces the next value; it does not alter a value another caller already holds.

<standard id="state-immutable-ownership">

## Immutable ownership

<why>

### Why

An installation plan must stay stable while it is inspected and applied. Storing its file count separately or mutating its changes array introduces avoidable disagreement.

</why>

<rules>

### Rules

<rule id="regard-received-arguments-and-module-level-data-as-readonly-inputs">

- <level>MUST</level> regard received arguments and module-level data as readonly inputs. <enforcement>[review]</enforcement>

</rule>

<rule id="return-a-fresh-object-or-array-when-an-operation">

- <level>MUST</level> return a fresh object or array when an operation changes domain data. <enforcement>[review]</enforcement>

</rule>

<rule id="keep-assignment-mutating-array-methods-and-object-assign-away-from">

- <level>MUST</level> keep assignment, mutating array methods, and `Object.assign` away from arguments and shared state. <enforcement>[review]</enforcement>

</rule>

<rule id="derive-counts-totals-and-filtered-views-from-the-authoritative">

- <level>MUST</level> derive counts, totals, and filtered views from the authoritative collection. <enforcement>[review]</enforcement>

</rule>

<rule id="maintain-one-authoritative-representation-of-each-domain-value">

- <level>MUST</level> maintain one authoritative representation of each domain value. <enforcement>[review]</enforcement>

</rule>

<rule id="use-immutable-application-collections-rather-than-authored-map-set">

- <level>MUST</level> use immutable application collections rather than authored `Map`, `Set`, `WeakMap`, or `WeakSet` state. <enforcement>[review]</enforcement>

</rule>

<rule id="keep-mutable-application-data-out-of-module-bindings-and">

- <level>MUST</level> keep mutable application data out of module bindings and factory closures. <enforcement>[review]</enforcement>

</rule>

<rule id="capture-resource-clients-in-factories-or-keep-handles-at">

- <level>MAY</level> capture resource clients in factories or keep handles at lifetimes owned by a framework. <enforcement>[review]</enforcement>

</rule>

</rules>

<examples>

### Example

```ts
type AppendEntryParams = {
  readonly entries: readonly string[]
  readonly entry: string
}

function appendEntry({ entries, entry }: AppendEntryParams): readonly string[] {
  return [...entries, entry]
}
```

</examples>

<enforcement>

[review]

Readonly types cover supported mutation paths. Tests and review check aliasing, nested fields, and mutable application state that annotations alone cannot prevent.

</enforcement>

</standard>

## Enforcement

Readonly types cover supported mutation paths. Tests and review check aliasing, nested fields, and mutable application state that annotations alone cannot prevent.
