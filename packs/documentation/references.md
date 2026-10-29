---
title: References
description: 'Describe caller-facing contracts precisely: inputs, defaults, outputs, failures, limits, and valid examples.'
---

# References

A reference answers a precise contract question. Keep its fields and outcomes accurate even when the reader skips the surrounding prose.

<standard id="references-contract-coverage">

## Contract coverage

<why>

### Why

A CLI option's name does not explain its default or whether the choice is persisted. Schema and command references need those details to prevent incorrect assumptions.

</why>

<rules>

### Rules

<rule id="identify-whether-the-surface-is-implemented-internal-only-released-or">

- <level>MUST</level> identify whether the surface is implemented, internal-only, released, or proposed. <enforcement>[review]</enforcement>

</rule>

<rule id="document-required-inputs-defaults-interpretation-bases-and-accepted-variants">

- <level>MUST</level> document required inputs, defaults, interpretation bases, and accepted variants. <enforcement>[review]</enforcement>

</rule>

<rule id="distinguish-definition-version-requested-package-version-and-upstream-commit">

- <level>MUST</level> distinguish definition version, requested package version, and upstream commit where relevant. <enforcement>[review]</enforcement>

</rule>

<rule id="describe-outputs-and-side-effects-including-files-created-or">

- <level>MUST</level> describe outputs and side effects, including files created or changed. <enforcement>[review]</enforcement>

</rule>

<rule id="include-an-errors-section-with-failure-conditions-and-the">

- <level>MUST</level> include an Errors section with failure conditions and the caller-visible result. <enforcement>[review]</enforcement>

</rule>

<rule id="include-a-valid-example-and-relevant-invalid-input-examples">

- <level>MUST</level> include a valid example and relevant invalid-input examples. <enforcement>[review]</enforcement>

</rule>

<rule id="name-limitations-such-as-unsupported-providers-or-unavailable-lifecycle">

- <level>MUST</level> name limitations such as unsupported providers or unavailable lifecycle commands. <enforcement>[review]</enforcement>

</rule>

<rule id="link-to-guides-for-complete-tasks-instead-of-repeating">

- <level>MUST</level> link to guides for complete tasks instead of repeating their steps. <enforcement>[review]</enforcement>

</rule>

<rule id="keep-cli-options-and-serialized-fields-in-tables-use">

- <level>SHOULD</level> keep CLI options and serialized fields in tables; use source-shaped examples for APIs. <enforcement>[review]</enforcement>

</rule>

</rules>

<examples>

## Schema reference outline

```md
# Project configuration

## Contract

Consumer intent is separate from locked commits and hashes.

## Fields

| Field  | Required | Default  | Behavior                   |
| ------ | -------- | -------- | -------------------------- |
| output | No       | .context | Relative installation root |
| packs  | Yes      | None     | Selected pack requests     |

## Examples

Show a valid local request and a valid Git request.

## Errors

Unknown keys, duplicate identities, and escaping output paths are invalid.

## Limitations

An edited config cannot be restored against a mismatching lockfile.
```

</examples>

<enforcement>

[review]

Component-content tests check standard metadata and heading structure. Typechecks and behavior tests establish code contracts; review checks reference completeness, including Errors, and compares prose against those contracts.

See [Guides](guides.md) for end-to-end actions and [Troubleshooting](troubleshooting.md) for recovery.

</enforcement>

</standard>

## Enforcement

Component-content tests check standard metadata and heading structure. Typechecks and behavior tests establish code contracts; review checks reference completeness, including Errors, and compares prose against those contracts.

See [Guides](guides.md) for end-to-end actions and [Troubleshooting](troubleshooting.md) for recovery.
