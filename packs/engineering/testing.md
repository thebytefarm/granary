---
title: Testing
description: 'Test consequential decisions and real boundaries with observable success and failure contracts.'
---

# Testing

Choose the test layer from the contract at risk.

<standard id="testing-behavioral-evidence">

## Behavioral evidence

<why>

### Why

A mocked writer cannot prove that an installation preserves unrelated files. Real disposable resources expose boundary mistakes.

</why>

<rules>

### Rules

<rule id="test-consequential-pure-decisions-validation-failures-and-failure-propagation">

- <level>MUST</level> test consequential pure decisions, validation failures, and failure propagation. <enforcement>[review]</enforcement>

</rule>

<rule id="exercise-filesystem-and-process-behavior-with-real-disposable-resources">

- <level>MUST</level> exercise filesystem and process behavior with real disposable resources. <enforcement>[review]</enforcement>

</rule>

<rule id="reserve-test-doubles-for-external-services-and-inject-them">

- <level>MUST</level> reserve test doubles for external services and inject them at the actual service boundary. <enforcement>[review]</enforcement>

</rule>

<rule id="avoid-replacing-the-internal-behavior-being-tested-with-a">

- <level>MUST</level> avoid replacing the internal behavior being tested with a fake. <enforcement>[review]</enforcement>

</rule>

<rule id="give-each-test-one-observable-behavior-and-a-present-tense">

- <level>MUST</level> give each test one observable behavior and a present-tense action name. <enforcement>[review]</enforcement>

</rule>

<rule id="verify-invariants-as-well-as-representative-successful-inputs">

- <level>MUST</level> verify invariants as well as representative successful inputs. <enforcement>[review]</enforcement>

</rule>

<rule id="keep-paid-services-and-nondeterministic-model-calls-outside-ordinary">

- <level>MUST</level> keep paid services and nondeterministic model calls outside ordinary test runs. <enforcement>[review]</enforcement>

</rule>

<rule id="report-unavailable-verification-rather-than-claim-it-passed">

- <level>MUST</level> report unavailable verification rather than claim it passed. <enforcement>[review]</enforcement>

</rule>

<rule id="avoid-tests-that-merely-restate-trivial-wiring-or-a">

- <level>MUST</level> avoid tests that merely restate trivial wiring or a language guarantee. <enforcement>[review]</enforcement>

</rule>

</rules>

<examples>

</examples>

<enforcement>

[review]

The consumer's test runner executes the cases. Review checks whether those cases exercise the behavior rather than a substitute for it.

</enforcement>

</standard>

## Enforcement

The consumer's test runner executes the cases. Review checks whether those cases exercise the behavior rather than a substitute for it.
