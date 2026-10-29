---
title: JSDoc
description: 'Explain call-site behavior in multiline JSDoc, demonstrate public usage, and identify private declarations.'
---

# JSDoc

Use JSDoc to describe what callers cannot learn from the signature alone.

<standard id="comments-exported-and-private-declarations">

## Exported and private declarations

<why>

### Why

A Result type does not explain whether missing metadata returns an empty catalog or a failure. That distinction belongs in the operation's documentation.

</why>

<rules>

### Rules

<rule id="precede-each-exported-function-with-a-jsdoc-block-spanning">

- <level>MUST</level> precede each exported function with a JSDoc block spanning multiple lines. <enforcement>[review]</enforcement>

</rule>

<rule id="begin-the-block-with-an-imperative-description-of-the">

- <level>MUST</level> begin the block with an imperative description of the operation. <enforcement>[review]</enforcement>

</rule>

<rule id="use-param-and-returns-to-explain-constraints-and-outcome">

- <level>MUST</level> use `@param` and `@returns` to explain constraints and outcome behavior that the signature leaves unclear. <enforcement>[review]</enforcement>

</rule>

<rule id="provide-a-usable-example-for-every-symbol-exposed-through">

- <level>MUST</level> provide a usable `@example` for every symbol exposed through a public package entrypoint. <enforcement>[review]</enforcement>

</rule>

<rule id="explain-exported-types-and-values-whose-role-is-not">

- <level>SHOULD</level> explain exported types and values whose role is not evident from their names. <enforcement>[review]</enforcement>

</rule>

<rule id="label-private-functions-and-private-implementation-types-with-private">

- <level>MUST</level> label private functions and private implementation types with `@private`. <enforcement>[review]</enforcement>

</rule>

<rule id="leave-typescript-type-syntax-out-of-jsdoc-tags-instead">

- <level>MUST</level> leave TypeScript type syntax out of JSDoc tags instead of repeating the signature. <enforcement>[review]</enforcement>

</rule>

<rule id="document-the-proven-safety-condition-immediately-above-an-allowed">

- <level>MUST</level> document the proven safety condition immediately above an allowed non-const assertion. <enforcement>[review]</enforcement>

</rule>

<rule id="leave-jsdoc-out-of-tests-and-focused-examples-in">

- <level>MAY</level> leave JSDoc out of tests and focused examples in this pack. <enforcement>[review]</enforcement>

</rule>

</rules>

<examples>

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

</examples>

<enforcement>

[review]

Configured documentation rules cover their supported syntax. Review checks caller-facing constraints, examples, and private declaration documentation.

</enforcement>

</standard>

## Enforcement

Configured documentation rules cover their supported syntax. Review checks caller-facing constraints, examples, and private declaration documentation.
