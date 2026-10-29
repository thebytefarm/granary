# Skills compatibility

Granary borrows skills' source-based installation experience while defining a separate reference-material contract.

## Familiar commands

The [skills CLI](https://github.com/vercel-labs/skills) installs from repositories and lists a source before installation. Granary borrows those source-oriented operations but uses declared pack locators and manifest composition rather than skill-selection flags.

| Concern                        | Skills                                            | Granary direction                               |
| ------------------------------ | ------------------------------------------------- | ----------------------------------------------- |
| Entry definition               | `SKILL.md` with frontmatter                       | `granary.json` points to a pack entry file      |
| Primary content                | Procedures and agent capabilities                 | Docs, source, examples, conventions             |
| Multiple items from one source | `--skill one two`                                 | Explicit members or multiple source entries     |
| Canonical local storage        | `.agents/skills/`                                 | `.granary/context/`                             |
| Agent integration              | Canonical files plus agent-specific directories   | Shared filesystem material with a reading index |
| Destination override           | Agent/scope-driven locations in the inspected CLI | Explicit `--output`                             |

## Hosted packs and catalog access

[skills.sh packs](https://skills.sh/docs/packs) are hosted collections that can contain several skills. Each included skill still needs a valid `SKILL.md`. Granary uses “pack” for one independently versioned bundle of reference material.

The [skills.sh API](https://skills.sh/docs/api) exposes catalog, search, detail/file-tree, and audit endpoints. That could support discovery or an adapter; it does not make a `granary.json` directory automatically compatible with skills.

We have not verified a supported published installer SDK that can be embedded as Granary's backend. Internal functions documented in the skills repository are not a stable SDK contract by themselves.

## Compatibility boundary

A source can contain both a skill and a context pack. A future adapter could resolve a skill's reference files into Granary's package model. The source and destination rules would need an explicit mapping, with tests against the provider's current API.

The initial Granary manifest does not require a `SKILL.md`, agent selection, or registration on skills.sh.

## Granary's own skills

Separately from third-party skill compatibility, the CLI package ships skills for authoring packs, customizing installed content, reviewing upstream previews, and preparing contributions. The [pack maintenance concept](pack-maintenance.md) defines those workflows and their current limits. See [using the skills](../guides/use-granary-skills.md) for installation; automatic skill registration is not part of context-pack installation.
