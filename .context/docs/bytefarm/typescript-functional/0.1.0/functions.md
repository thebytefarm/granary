---
title: Functions
description: 'Make operations findable with declarations, explicit contracts, named inputs, and a single responsibility.'
---

# Functions

Give each named operation a declaration and a contract that explains what it consumes and produces.

## Declaration and contract

### Why

Selection, hashing, and project writes are different jobs. Keeping them separate makes workflows readable without making a caller memorize several positional strings.

### Rules

- MUST declare named helpers, handlers, factories, components, and exported operations with `function`.
- MAY express inline or returned callbacks with arrows.
- MAY assign a composition result to a `const` binding.
- MUST annotate the return contract of every exported function.
- MUST replace two or more authored parameters with one destructured object parameter.
- MUST give that object's named type a `Params` or `Options` suffix.
- MAY use the callback signature required by an external framework.
- MUST separate distinct jobs into functions and let the caller coordinate them.

### Example

```ts
type BuildEntryLinkParams = {
  readonly directory: string
  readonly entry: string
}

function buildEntryLink({ directory, entry }: BuildEntryLinkParams): string {
  return `${directory}/${entry}`
}
```

Focused examples leave out JSDoc unless they demonstrate it. The [JSDoc contract](comments.md) still applies to authored source.

## Enforcement

Typechecks establish signature use. Review checks declaration style, named inputs, and single responsibility unless a consumer configures additional lint rules.
