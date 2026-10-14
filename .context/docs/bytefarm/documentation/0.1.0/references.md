---
title: References
description: 'Describe caller-facing contracts precisely: inputs, defaults, outputs, failures, limits, and valid examples.'
---

# References

A reference answers a precise contract question. Keep its fields and outcomes accurate even when the reader skips the surrounding prose.

## Contract coverage

### Why

A CLI option's name does not explain its default or whether the choice is persisted. Schema and command references need those details to prevent incorrect assumptions.

### Rules

- MUST identify whether the surface is implemented, internal-only, released, or proposed.
- MUST document required inputs, defaults, interpretation bases, and accepted variants.
- MUST distinguish definition version, requested package version, and upstream commit where relevant.
- MUST describe outputs and side effects, including files created or changed.
- MUST include an Errors section with failure conditions and the caller-visible result.
- MUST include a valid example and relevant invalid-input examples.
- MUST name limitations such as unsupported providers or unavailable lifecycle commands.
- MUST link to guides for complete tasks instead of repeating their steps.
- SHOULD keep CLI options and serialized fields in tables; use source-shaped examples for APIs.

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

## Enforcement

Component-content tests check standard metadata and heading structure. Typechecks and behavior tests establish code contracts; review checks reference completeness, including Errors, and compares prose against those contracts.

See [Guides](guides.md) for end-to-end actions and [Troubleshooting](troubleshooting.md) for recovery.
