---
title: Naming
description: 'Name concrete operations and domain values, with casing that stays predictable across platforms.'
---

# Naming

Let the containing directory supply context, then name the operation or value precisely.

## Conventions

### Why

`packs/manifest.ts` is easier to navigate than a repeated pack prefix. A name such as `findGitCommit` tells a caller more than a vague `resolve` helper.

| Kind                                  | Convention                          | Example                      |
| ------------------------------------- | ----------------------------------- | ---------------------------- |
| Files and directories                 | kebab-case                          | `sources/local/directory.ts` |
| Functions and values                  | camelCase                           | `readManifest`, `manifest`   |
| Types                                 | PascalCase                          | `ReadManifestParams`         |
| Booleans and predicates               | `is`, `has`, `can`, `should`        | `isInstalled`                |
| Stable constants and literal catalogs | SCREAMING_SNAKE_CASE                | `MAX_PACK_BYTES`             |
| Schemas and clients                   | camelCase                           | `packSchema`                 |
| Generic parameters                    | Whole words in SCREAMING_SNAKE_CASE | `CONTENT`, `SOURCE_KIND`     |

### Rules

- MUST apply the table's casing conventions to newly authored declarations.
- MUST choose operation verbs for functions and domain nouns for values.
- MUST spell out generic parameter names rather than using single letters.
- MUST put related literals in an `as const` catalog and derive its union type.
- SHOULD collect related fields beneath a meaningful domain object instead of repeating the same prefix.
- MAY retain filenames imposed by tooling or established conventions, such as `README.md`, `AGENTS.md`, and `LICENSE`.

## Enforcement

Configured lint checks cover their supported naming rules. Review checks operation verbs, domain meaning, and the remaining casing conventions.
