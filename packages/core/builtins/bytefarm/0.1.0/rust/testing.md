---
title: Testing
description: 'Verify Rust value contracts, resource adapters, and public examples with real observable outcomes.'
---

# Testing

Combine focused value tests, resource integration tests, and public doctests.

<standard id="testing-verification">

## Verification

<why>

### Why

Ownership compilation does not prove that an adapter preserves unrelated files or reports the correct failure variant.

</why>

<rules>

### Rules

<rule id="test-consequential-valid-and-invalid-inputs-through-native-result">

- <level>MUST</level> test consequential valid and invalid inputs through native Result variants. <enforcement>[review]</enforcement>

</rule>

<rule id="use-real-disposable-local-resources-for-filesystem-and-subprocess">

- <level>MUST</level> use real disposable local resources for filesystem and subprocess contracts. <enforcement>[review]</enforcement>

</rule>

<rule id="run-cargo-tests-and-public-doctests-for-the-affected">

- <level>MUST</level> run Cargo tests and public doctests for the affected crate. <enforcement>[review]</enforcement>

</rule>

<rule id="run-rustfmt-and-the-consumer-s-configured-clippy-checks">

- <level>MUST</level> run rustfmt and the consumer's configured Clippy checks. <enforcement>[review]</enforcement>

</rule>

<rule id="keep-fixture-assertions-distinct-from-production-error-handling">

- <level>MUST</level> keep fixture assertions distinct from production error handling. <enforcement>[review]</enforcement>

</rule>

<rule id="isolate-resource-tests-so-parallel-runs-cannot-alter-another">

- <level>MUST</level> isolate resource tests so parallel runs cannot alter another test's state. <enforcement>[review]</enforcement>

</rule>

<rule id="use-property-tests-for-parsers-and-transformations-after-dependency">

- <level>MAY</level> use property tests for parsers and transformations after dependency approval. <enforcement>[review]</enforcement>

</rule>

<rule id="use-nextest-when-it-is-already-part-of-the">

- <level>MAY</level> use nextest when it is already part of the consumer's toolchain. <enforcement>[review]</enforcement>

</rule>

</rules>

<examples>

</examples>

<enforcement>

[review]

Cargo, rustfmt, and configured Clippy invocations provide executable checks. Review checks whether the suite exercises the actual contract.

</enforcement>

</standard>

## Enforcement

Cargo, rustfmt, and configured Clippy invocations provide executable checks. Review checks whether the suite exercises the actual contract.
