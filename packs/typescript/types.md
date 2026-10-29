---
title: Types
description: 'Validate external values, retain readonly contracts, and represent source variants with discriminated unions.'
---

# Types

Use types to describe valid states. Use runtime checks to establish whether external data belongs to those states.

<standard id="types-narrowing-and-modeling">

## Narrowing and modeling

<why>

### Why

A local directory and a Git commit have different required fields. One broad object with optional fields permits combinations the installer cannot use.

</why>

<rules>

### Rules

<rule id="accept-untrusted-data-as-unknown-until-a-schema-or">

- <level>MUST</level> accept untrusted data as `unknown` until a schema or type guard validates it. <enforcement>[review]</enforcement>

</rule>

<rule id="avoid-any-the-non-null-assertion-operator-and-assertions-unsupported">

- <level>MUST</level> avoid `any`, the non-null assertion operator, and assertions unsupported by a runtime check. <enforcement>[review]</enforcement>

</rule>

<rule id="retain-literal-types-with-as-const-or-use-a">

- <level>MAY</level> retain literal types with `as const`, or use a documented assertion immediately after proving it at runtime. <enforcement>[review]</enforcement>

</rule>

<rule id="use-type-for-object-contracts-reserve-interface-for-necessary">

- <level>MUST</level> use `type` for object contracts; reserve `interface` for necessary augmentation or declaration merging. <enforcement>[review]</enforcement>

</rule>

<rule id="expose-object-fields-and-incoming-collections-through-readonly-types">

- <level>MUST</level> expose object fields and incoming collections through readonly types. <enforcement>[review]</enforcement>

</rule>

<rule id="assign-variants-a-common-literal-discriminant-and-variant-specific-required">

- <level>MUST</level> assign variants a common literal discriminant and variant-specific required data. <enforcement>[review]</enforcement>

</rule>

<rule id="derive-a-union-from-its-literal-catalog-instead-of">

- <level>MUST</level> derive a union from its literal catalog instead of maintaining parallel lists. <enforcement>[review]</enforcement>

</rule>

<rule id="try-built-in-utility-types-before-duplicating-a-related-contract">

- <level>MUST</level> try built-in utility types before duplicating a related contract or writing a mapped type. <enforcement>[review]</enforcement>

</rule>

<rule id="inspect-type-fest-when-a-built-in-utility-cannot-express-the">

- <level>SHOULD</level> inspect type-fest when a built-in utility cannot express the needed relationship, subject to the consumer's dependency approval. <enforcement>[review]</enforcement>

</rule>

</rules>

<examples>

### Example

```ts
type ContentOrigin =
  | { readonly kind: 'directory'; readonly path: string }
  | { readonly kind: 'commit'; readonly repository: string; readonly commit: string }
```

</examples>

<enforcement>

[review]

Typechecks establish supported narrowing and readonly contracts. Boundary tests prove runtime validation; review checks unsafe assertions and deeper immutability.

</enforcement>

</standard>

## Enforcement

Typechecks establish supported narrowing and readonly contracts. Boundary tests prove runtime validation; review checks unsafe assertions and deeper immutability.
