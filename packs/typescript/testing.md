---
title: Testing
description: 'Prove observable contracts with real local files and processes, reserving test doubles for external services.'
---

# Testing

Choose the test layer from the contract at risk. A schema decision and a packaged executable need different evidence.

<standard id="testing-layers-and-test-doubles">

## Layers and test doubles

<why>

### Why

A mocked file writer cannot prove that restoration preserves unrelated files. Disposable directories and real Git subprocesses exercise those contracts without requiring a paid service.

</why>

<rules>

### Rules

<rule id="cover-consequential-pure-decisions-validation-failures-and-failure-handling-branches">

- <level>MUST</level> cover consequential pure decisions, validation failures, and failure-handling branches with unit tests. <enforcement>[review]</enforcement>

</rule>

<rule id="exercise-filesystem-subprocess-and-network-adapter-contracts-at-an-integration">

- <level>MUST</level> exercise filesystem, subprocess, and network-adapter contracts at an integration boundary. <enforcement>[review]</enforcement>

</rule>

<rule id="supply-actual-files-in-disposable-directories-when-verifying-filesystem">

- <level>MUST</level> supply actual files in disposable directories when verifying filesystem behavior. <enforcement>[review]</enforcement>

</rule>

<rule id="limit-test-doubles-to-external-services-and-inject-their">

- <level>MUST</level> limit test doubles to external services and inject their clients through adapter factories. <enforcement>[review]</enforcement>

</rule>

<rule id="exercise-internal-modules-directly-rather-than-replacing-the-asserted">

- <level>MUST</level> exercise internal modules directly rather than replacing the asserted behavior with a fake. <enforcement>[review]</enforcement>

</rule>

<rule id="keep-paid-model-calls-and-nondeterministic-model-assertions-outside">

- <level>MUST</level> keep paid model calls and nondeterministic model assertions outside ordinary test runs. <enforcement>[review]</enforcement>

</rule>

<rule id="avoid-cases-that-only-repeat-a-trivial-pass-through-or">

- <level>MUST</level> avoid cases that only repeat a trivial pass-through or a TypeScript guarantee. <enforcement>[review]</enforcement>

</rule>

<rule id="retain-smoke-tests-against-the-built-cli-to-verify">

- <level>MAY</level> retain smoke tests against the built CLI to verify startup, packaging, and executable behavior. <enforcement>[review]</enforcement>

</rule>

</rules>

<examples>

</examples>

<enforcement>

[review]

The configured test runner executes value and resource cases. Review checks real boundary use, meaningful failure coverage, and accurate verification reports.

</enforcement>

</standard>

<standard id="testing-organization-and-verification">

## Organization and verification

<why>

### Why

The failing test name should explain the broken contract. Keeping cases beside their implementation makes that contract easier to maintain.

</why>

<rules>

### Rules

<rule id="colocate-cases-in-test-ts-should-use-integration-test-ts-for-larger">

- <level>MUST</level> colocate cases in `*.test.ts`; SHOULD use `*.integration.test.ts` for larger resource suites when a separate runner exists. <enforcement>[review]</enforcement>

</rule>

<rule id="use-describe-groups-and-present-tense-behavior-verbs-in-it">

- <level>MUST</level> use `describe` groups and present-tense behavior verbs in `it` names. <enforcement>[review]</enforcement>

</rule>

<rule id="keep-each-case-focused-on-one-behavior-allowing-multiple">

- <level>MUST</level> keep each case focused on one behavior, allowing multiple assertions to establish it. <enforcement>[review]</enforcement>

</rule>

<rule id="invoke-the-consuming-repository-s-validation-commands-using-workspace-filters">

- <level>MUST</level> invoke the consuming repository's validation commands, using workspace filters when it has workspaces. <enforcement>[review]</enforcement>

</rule>

<rule id="build-a-distributed-artifact-before-testing-that-artifact-s-entrypoint">

- <level>MUST</level> build a distributed artifact before testing that artifact's entrypoint. <enforcement>[review]</enforcement>

</rule>

<rule id="report-a-testless-package-as-testless-rather-than-describing">

- <level>MUST</level> report a testless package as testless, rather than describing it as covered. <enforcement>[review]</enforcement>

</rule>

</rules>

<examples>

</examples>

<enforcement>

[review]

The configured test runner executes value and resource cases. Review checks real boundary use, meaningful failure coverage, and accurate verification reports.

</enforcement>

</standard>

## Enforcement

The configured test runner executes value and resource cases. Review checks real boundary use, meaningful failure coverage, and accurate verification reports.
