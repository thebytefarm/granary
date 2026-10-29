---
title: Utilities
description: 'Use the existing utility vocabulary and make pipeline stages and I/O concurrency explicit.'
---

# Utilities

Search the installed toolkit and the owning domain module before writing another helper.

<standard id="utilities-reuse">

## Reuse

<why>

### Why

A second deduplication helper creates a second set of edge cases to maintain. Domain-specific naming belongs around domain behavior, not around a replacement for an existing library operation.

</why>

<rules>

### Rules

<rule id="inspect-massaman-s-installed-exports-before-authoring-generic-collection-text">

- <level>MUST</level> inspect massaman's installed exports before authoring generic collection, text, math, control, or matching utilities. <enforcement>[review]</enforcement>

</rule>

<rule id="look-for-a-domain-owned-capability-before-adding-a-local">

- <level>MUST</level> look for a domain-owned capability before adding a local helper for the same job. <enforcement>[review]</enforcement>

</rule>

<rule id="import-named-functions-from-the-smallest-suitable-library-subpath">

- <level>MUST</level> import named functions from the smallest suitable library subpath. <enforcement>[review]</enforcement>

</rule>

<rule id="avoid-namespace-imports-of-an-entire-utility-library-and">

- <level>MUST</level> avoid namespace imports of an entire utility library and avoid reimplementing supported operations. <enforcement>[review]</enforcement>

</rule>

<rule id="use-native-non-mutating-map-filter-find-some-every-reduce">

- <level>MAY</level> use native non-mutating `map`, `filter`, `find`, `some`, `every`, `reduce`, and `flatMap` for straightforward transforms. <enforcement>[review]</enforcement>

</rule>

<rule id="prefer-the-toolkit-s-grouping-deduplication-and-sorting-functions-to">

- <level>SHOULD</level> prefer the toolkit's grouping, deduplication, and sorting functions to custom reductions. <enforcement>[review]</enforcement>

</rule>

<rule id="obtain-installation-approval-even-when-these-docs-recommend-massaman">

- <level>MUST</level> obtain installation approval even when these docs recommend massaman or another library. <enforcement>[review]</enforcement>

</rule>

</rules>

<examples>

</examples>

<enforcement>

[review]

Typechecks and behavioral tests establish supported pipeline contracts. Review checks reuse, named stages, resource concurrency, and dependency authorization.

</enforcement>

</standard>

<standard id="utilities-composition-and-async-work">

## Composition and async work

<why>

### Why

Stages reveal where data changes shape. A collection of file reads or source fetches also needs a stated concurrency limit so work does not grow without bounds.

</why>

<rules>

### Rules

<rule id="use-massaman-s-flow-or-flowasync-for-data-transformations-with">

- <level>MUST</level> use massaman's `flow` or `flowAsync` for data transformations with at least three stages. <enforcement>[review]</enforcement>

</rule>

<rule id="express-an-appropriate-boundary-pipeline-effect-with-tap">

- <level>SHOULD</level> express an appropriate boundary-pipeline effect with `tap`. <enforcement>[review]</enforcement>

</rule>

<rule id="give-asynchronous-collection-helpers-an-explicit-concurrency-bound-for">

- <level>MUST</level> give asynchronous collection helpers an explicit concurrency bound for external I/O. <enforcement>[review]</enforcement>

</rule>

<rule id="avoid-unbounded-external-work-launched-with-promise-all-items-map">

- <level>MUST</level> avoid unbounded external work launched with `Promise.all(items.map(...))`. <enforcement>[review]</enforcement>

</rule>

<rule id="replace-a-library-helper-on-a-measured-hot-path">

- <level>MAY</level> replace a library helper on a measured hot path after documenting the measurement and obtaining approval. <enforcement>[review]</enforcement>

</rule>

</rules>

<examples>

</examples>

<enforcement>

[review]

Typechecks and behavioral tests establish supported pipeline contracts. Review checks reuse, named stages, resource concurrency, and dependency authorization.

</enforcement>

</standard>

## Enforcement

Typechecks and behavioral tests establish supported pipeline contracts. Review checks reuse, named stages, resource concurrency, and dependency authorization.
