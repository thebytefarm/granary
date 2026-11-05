---
title: Functions
description: 'Make operations findable with declarations, explicit contracts, named inputs, and a single responsibility.'
---

# Functions

Give each named operation a declaration and a contract that explains what it consumes and produces.

<standard id="functions-declaration-and-contract">

## Declaration and contract

<why>

### Why

Selection, hashing, and project writes are different jobs. Keeping them separate makes workflows readable without making a caller memorize several positional strings.

</why>

<rules>

### Rules

<rule id="declare-named-helpers-handlers-factories-components-and-exported-operations">

- <level>MUST</level> declare named helpers, handlers, factories, components, and exported operations with `function`. <enforcement>[review]</enforcement>

</rule>

<rule id="express-inline-or-returned-callbacks-with-arrows">

- <level>MAY</level> express inline or returned callbacks with arrows. <enforcement>[review]</enforcement>

</rule>

<rule id="assign-a-composition-result-to-a-const-binding">

- <level>MAY</level> assign a composition result to a `const` binding. <enforcement>[review]</enforcement>

</rule>

<rule id="annotate-the-return-contract-of-every-exported-function">

- <level>MUST</level> annotate the return contract of every exported function. <enforcement>[review]</enforcement>

</rule>

<rule id="replace-two-or-more-authored-parameters-with-one-destructured">

- <level>MUST</level> replace two or more authored parameters with one destructured object parameter. <enforcement>[review]</enforcement>

</rule>

<rule id="give-that-object-s-named-type-a-params-or-options">

- <level>MUST</level> give that object's named type a `Params` or `Options` suffix. <enforcement>[review]</enforcement>

</rule>

<rule id="use-the-callback-signature-required-by-an-external-framework">

- <level>MAY</level> use the callback signature required by an external framework. <enforcement>[review]</enforcement>

</rule>

<rule id="separate-distinct-jobs-into-functions-and-let-the-caller">

- <level>MUST</level> separate distinct jobs into functions and let the caller coordinate them. <enforcement>[review]</enforcement>

</rule>

</rules>

<examples>

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

</examples>

<enforcement>

[review]

Typechecks establish signature use. Review checks declaration style, named inputs, and single responsibility unless a consumer configures additional lint rules.

</enforcement>

</standard>

## Enforcement

Typechecks establish signature use. Review checks declaration style, named inputs, and single responsibility unless a consumer configures additional lint rules.
