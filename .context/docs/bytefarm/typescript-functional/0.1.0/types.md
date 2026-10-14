---
title: Types
description: 'Validate external values, retain readonly contracts, and represent source variants with discriminated unions.'
---

# Types

Use types to describe valid states. Use runtime checks to establish whether external data belongs to those states.

## Narrowing and modeling

### Why

A local directory and a Git commit have different required fields. One broad object with optional fields permits combinations the installer cannot use.

### Rules

- MUST accept untrusted data as `unknown` until a schema or type guard validates it.
- MUST avoid `any`, the non-null assertion operator, and assertions unsupported by a runtime check.
- MAY retain literal types with `as const`, or use a documented assertion immediately after proving it at runtime.
- MUST use `type` for object contracts; reserve `interface` for necessary augmentation or declaration merging.
- MUST expose object fields and incoming collections through readonly types.
- MUST assign variants a common literal discriminant and variant-specific required data.
- MUST derive a union from its literal catalog instead of maintaining parallel lists.
- MUST try built-in utility types before duplicating a related contract or writing a mapped type.
- SHOULD inspect type-fest when a built-in utility cannot express the needed relationship, subject to the consumer's dependency approval.

### Example

```ts
type ContentOrigin =
  | { readonly kind: 'directory'; readonly path: string }
  | { readonly kind: 'commit'; readonly repository: string; readonly commit: string }
```

## Enforcement

Typechecks establish supported narrowing and readonly contracts. Boundary tests prove runtime validation; review checks unsafe assertions and deeper immutability.
