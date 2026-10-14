---
title: JSDoc
description: 'Explain call-site behavior in multiline JSDoc, demonstrate public usage, and identify private declarations.'
---

# JSDoc

Use JSDoc to describe what callers cannot learn from the signature alone.

## Exported and private declarations

### Why

A Result type does not explain whether missing metadata returns an empty catalog or a failure. That distinction belongs in the operation's documentation.

### Rules

- MUST precede each exported function with a JSDoc block spanning multiple lines.
- MUST begin the block with an imperative description of the operation.
- MUST use `@param` and `@returns` to explain constraints and outcome behavior that the signature leaves unclear.
- MUST provide a usable `@example` for every symbol exposed through a public package entrypoint.
- SHOULD explain exported types and values whose role is not evident from their names.
- MUST label private functions and private implementation types with `@private`.
- MUST leave TypeScript type syntax out of JSDoc tags instead of repeating the signature.
- MUST document the proven safety condition immediately above an allowed non-const assertion.
- MAY leave JSDoc out of tests and focused examples in this pack.

The [shared principles](README.md#shared-principles) route code-comment rationale, workarounds, and unfinished work to the engineering component.

## Examples

An exported function's single-line comment is insufficient. This example documents the observable choice rather than repeating its types:

```ts
type HasEntryParams = {
  readonly entry: string
  readonly selectedFiles: readonly string[]
}

/**
 * Check whether selected content includes its declared entrypoint.
 * @param options - Entry path and selected paths, both relative to the same content root.
 * @returns Whether the exact entry path is selected.
 * @example
 * hasEntry({ entry: 'START.md', selectedFiles: ['START.md', 'guide.md'] })
 */
export function hasEntry({ entry, selectedFiles }: HasEntryParams): boolean {
  return selectedFiles.includes(entry)
}
```

Private implementation details use `@private`; keep their blocks multiline for consistency:

```ts
/**
 * @private
 */
function hasLeadingSlash(path: string): boolean {
  return path.startsWith('/')
}
```

## Enforcement

Configured documentation rules cover their supported syntax. Review checks caller-facing constraints, examples, and private declaration documentation.
