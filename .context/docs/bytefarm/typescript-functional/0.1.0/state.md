---
title: State
description: 'Produce new values for state changes and keep mutable resource handles separate from installation data.'
---

# State

An update produces the next value; it does not alter a value another caller already holds.

## Immutable ownership

### Why

An installation plan must stay stable while it is inspected and applied. Storing its file count separately or mutating its changes array introduces avoidable disagreement.

### Rules

- MUST regard received arguments and module-level data as readonly inputs.
- MUST return a fresh object or array when an operation changes domain data.
- MUST keep assignment, mutating array methods, and `Object.assign` away from arguments and shared state.
- MUST derive counts, totals, and filtered views from the authoritative collection.
- MUST maintain one authoritative representation of each domain value.
- MUST use immutable application collections rather than authored `Map`, `Set`, `WeakMap`, or `WeakSet` state.
- MUST keep mutable application data out of module bindings and factory closures.
- MAY capture resource clients in factories or keep handles at lifetimes owned by a framework.

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

## Enforcement

Readonly types cover supported mutation paths. Tests and review check aliasing, nested fields, and mutable application state that annotations alone cannot prevent.
