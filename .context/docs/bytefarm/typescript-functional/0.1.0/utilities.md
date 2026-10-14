---
title: Utilities
description: 'Use the existing utility vocabulary and make pipeline stages and I/O concurrency explicit.'
---

# Utilities

Search the installed toolkit and the owning domain module before writing another helper.

## Reuse

### Why

A second deduplication helper creates a second set of edge cases to maintain. Domain-specific naming belongs around domain behavior, not around a replacement for an existing library operation.

### Rules

- MUST inspect massaman's installed exports before authoring generic collection, text, math, control, or matching utilities.
- MUST look for a domain-owned capability before adding a local helper for the same job.
- MUST import named functions from the smallest suitable library subpath.
- MUST avoid namespace imports of an entire utility library and avoid reimplementing supported operations.
- MAY use native non-mutating `map`, `filter`, `find`, `some`, `every`, `reduce`, and `flatMap` for straightforward transforms.
- SHOULD prefer the toolkit's grouping, deduplication, and sorting functions to custom reductions.
- MUST obtain installation approval even when these docs recommend massaman or another library.

## Composition and async work

### Why

Stages reveal where data changes shape. A collection of file reads or source fetches also needs a stated concurrency limit so work does not grow without bounds.

### Rules

- MUST use massaman's `flow` or `flowAsync` for data transformations with at least three stages.
- SHOULD express an appropriate boundary-pipeline effect with `tap`.
- MUST give asynchronous collection helpers an explicit concurrency bound for external I/O.
- MUST avoid unbounded external work launched with `Promise.all(items.map(...))`.
- MAY replace a library helper on a measured hot path after documenting the measurement and obtaining approval.

## Enforcement

Typechecks and behavioral tests establish supported pipeline contracts. Review checks reuse, named stages, resource concurrency, and dependency authorization.
