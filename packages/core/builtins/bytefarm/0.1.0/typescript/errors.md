---
title: Errors
description: 'Carry failure as a typed Result, contain third-party exceptions, and classify failures without text matching.'
---

# Errors

A missing entrypoint, unavailable source, or edited destination is a normal installation outcome. Return that failure to the caller as data.

<standard id="errors-result-contracts">

## Result contracts

<why>

### Why

Workflows need to stop on a failed stage without losing its cause. One Result shape lets selection, retrieval, and writing use the same handling pattern.

</why>

<rules>

### Rules

<rule id="return-result-from-massaman-control-for-fallible-parsing-validation-resource">

- <level>MUST</level> return `Result` from `massaman/control` for fallible parsing, validation, resource access, and domain operations. <enforcement>[review]</enforcement>

</rule>

<rule id="build-successful-and-failed-outcomes-with-that-module-s-ok">

- <level>MUST</level> build successful and failed outcomes with that module's `ok` and `err` functions. <enforcement>[review]</enforcement>

</rule>

<rule id="keep-tuple-results-and-independently-invented-failure-containers-out">

- <level>MUST</level> keep tuple Results and independently invented failure containers out of domain code. <enforcement>[review]</enforcement>

</rule>

<rule id="avoid-authored-exception-control-flow-throw-try-catch-and-custom">

- <level>MUST</level> avoid authored exception control flow (`throw`, `try/catch`) and custom Error subclasses. <enforcement>[review]</enforcement>

</rule>

<rule id="contain-third-party-throws-and-promise-rejections-with-attempt-or">

- <level>MUST</level> contain third-party throws and promise rejections with `attempt` or `attemptAsync` in the owning adapter. <enforcement>[review]</enforcement>

</rule>

<rule id="establish-the-result-variant-with-isok-iserr-or-an">

- <level>MUST</level> establish the Result variant with `isOk`, `isErr`, or an exhaustive match before accessing its payload. <enforcement>[review]</enforcement>

</rule>

<rule id="propagate-a-failure-until-the-boundary-responsible-for-display">

- <level>MUST</level> propagate a failure until the boundary responsible for display or process exit handles it. <enforcement>[review]</enforcement>

</rule>

<rule id="convert-a-result-at-that-boundary-when-the-framework">

- <level>MAY</level> convert a Result at that boundary when the framework requires a different contract. <enforcement>[review]</enforcement>

</rule>

</rules>

<examples>

</examples>

<enforcement>

[review]

Result types and failure-path tests establish propagation and classification. Configure syntax checks for authored exception control flow; review checks complete third-party boundaries.

</enforcement>

</standard>

<standard id="errors-typed-failures">

## Typed failures

<why>

### Why

Changing an error's wording should not alter how a caller reacts. A readonly `kind` field separates the decision from the human-facing message.

</why>

<rules>

### Rules

<rule id="specify-the-failure-type-in-result-content-failure-when-callers">

- <level>MUST</level> specify the failure type in `Result<CONTENT, FAILURE>` when callers distinguish failure categories. <enforcement>[review]</enforcement>

</rule>

<rule id="combine-an-error-value-with-a-readonly-literal-kind">

- <level>MUST</level> combine an Error value with a readonly literal `kind` field for a classified failure. <enforcement>[review]</enforcement>

</rule>

<rule id="create-classified-errors-through-a-factory-using-a-fresh">

- <level>MUST</level> create classified errors through a factory using a fresh Error instance. <enforcement>[review]</enforcement>

</rule>

<rule id="base-handling-on-the-discriminant-not-message-fragments-and">

- <level>MUST</level> base handling on the discriminant, not message fragments, and avoid untyped plain-object arguments to `err`. <enforcement>[review]</enforcement>

</rule>

<rule id="exhaustively-handle-a-closed-failure-union">

- <level>MUST</level> exhaustively handle a closed failure union. <enforcement>[review]</enforcement>

</rule>

</rules>

<examples>

Read the [shared principles](README.md#shared-principles) for dependency evaluation and the consumer's instructions for installation authorization.

</examples>

<enforcement>

[review]

Result types and failure-path tests establish propagation and classification. Configure syntax checks for authored exception control flow; review checks complete third-party boundaries.

</enforcement>

</standard>

## Enforcement

Result types and failure-path tests establish propagation and classification. Configure syntax checks for authored exception control flow; review checks complete third-party boundaries.
