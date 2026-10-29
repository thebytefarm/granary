---
title: Testing
description: 'Verify typed Python outcomes, real resource boundaries, and the supported returns typing setup.'
---

# Testing

Test value contracts and the actual resource boundary, including failure propagation.

<standard id="testing-verification">

## Verification

<why>

### Why

A syntax check can parse a returns import without proving that the library is installed or its types are compatible.

</why>

<rules>

### Rules

<rule id="exercise-successful-and-failed-result-variants-through-observable-outcomes">

- <level>MUST</level> exercise successful and failed Result variants through observable outcomes. <enforcement>[review]</enforcement>

</rule>

<rule id="test-real-disposable-filesystem-and-subprocess-resources">

- <level>MUST</level> test real disposable filesystem and subprocess resources. <enforcement>[review]</enforcement>

</rule>

<rule id="execute-examples-in-an-isolated-environment-with-their-declared">

- <level>MUST</level> execute examples in an isolated environment with their declared dependencies. <enforcement>[review]</enforcement>

</rule>

<rule id="typecheck-returns-examples-with-the-supported-mypy-version-and">

- <level>MUST</level> typecheck returns examples with the supported mypy version and returns plugin. <enforcement>[review]</enforcement>

</rule>

<rule id="configure-the-consumer-s-lint-and-formatting-checks-and-run">

- <level>MUST</level> configure the consumer's lint and formatting checks and run them with tests. <enforcement>[review]</enforcement>

</rule>

<rule id="avoid-paid-or-nondeterministic-external-calls-in-ordinary-suites">

- <level>MUST</level> avoid paid or nondeterministic external calls in ordinary suites. <enforcement>[review]</enforcement>

</rule>

<rule id="use-test-assertions-only-for-verification-not-model-them">

- <level>MUST</level> use test assertions only for verification, not model them as domain failure handling. <enforcement>[review]</enforcement>

</rule>

<rule id="report-syntax-only-verification-distinctly-from-execution-and-typechecking">

- <level>MUST</level> report syntax-only verification distinctly from execution and typechecking. <enforcement>[review]</enforcement>

</rule>

<rule id="use-property-tests-for-parsers-and-immutable-transformations-after">

- <level>MAY</level> use property tests for parsers and immutable transformations after dependency approval. <enforcement>[review]</enforcement>

</rule>

</rules>

<examples>

</examples>

<enforcement>

[review]

The configured runner, typechecker, formatter, and exception-syntax checks enforce their contracts. Review checks meaningful coverage and real boundary use.

</enforcement>

</standard>

## Enforcement

The configured runner, typechecker, formatter, and exception-syntax checks enforce their contracts. Review checks meaningful coverage and real boundary use.
