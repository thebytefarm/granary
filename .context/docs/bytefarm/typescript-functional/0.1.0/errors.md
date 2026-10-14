---
title: Errors
description: 'Carry failure as a typed Result, contain third-party exceptions, and classify failures without text matching.'
---

# Errors

A missing entrypoint, unavailable source, or edited destination is a normal installation outcome. Return that failure to the caller as data.

## Result contracts

### Why

Workflows need to stop on a failed stage without losing its cause. One Result shape lets selection, retrieval, and writing use the same handling pattern.

### Rules

- MUST return `Result` from `massaman/control` for fallible parsing, validation, resource access, and domain operations.
- MUST build successful and failed outcomes with that module's `ok` and `err` functions.
- MUST keep tuple Results and independently invented failure containers out of domain code.
- MUST avoid authored exception control flow (`throw`, `try/catch`) and custom Error subclasses.
- MUST contain third-party throws and promise rejections with `attempt` or `attemptAsync` in the owning adapter.
- MUST establish the Result variant with `isOk`, `isErr`, or an exhaustive match before accessing its payload.
- MUST propagate a failure until the boundary responsible for display or process exit handles it.
- MAY convert a Result at that boundary when the framework requires a different contract.

## Typed failures

### Why

Changing an error's wording should not alter how a caller reacts. A readonly `kind` field separates the decision from the human-facing message.

### Rules

- MUST specify the failure type in `Result<CONTENT, FAILURE>` when callers distinguish failure categories.
- MUST combine an Error value with a readonly literal `kind` field for a classified failure.
- MUST create classified errors through a factory using a fresh Error instance.
- MUST base handling on the discriminant, not message fragments, and avoid untyped plain-object arguments to `err`.
- MUST exhaustively handle a closed failure union.

Read the [shared principles](README.md#shared-principles) for dependency evaluation and the consumer's instructions for installation authorization.

## Enforcement

Result types and failure-path tests establish propagation and classification. Configure syntax checks for authored exception control flow; review checks complete third-party boundaries.
