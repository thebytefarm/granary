# Granary context packs

Install versioned docs and source into your repo so coding agents can work from local reference material.

Bundle validation, local/Git installation, content selection, and locked restoration are implemented in the workspace. See [project status](../getting-started/status.md).

## Concept

A package manager for coding-agent context. A context pack contains the material an agent needs to understand a library, framework, service, or project: docs, relevant source code, examples, and conventions.

Install packs into the workspace as ordinary files. Agents read them with their existing filesystem and search tools. The experience is a local Context7, with explicit package selection and reproducible installs.

The package source can be a directory or Git repository. Object storage and URL/API providers remain planned. Publishing to a central registry is optional.

## What ships in a pack

- **Docs:** API references, guides, architecture notes, and explanations.
- **Source:** Core implementation files that help an agent understand actual behavior.
- **Examples:** Usage patterns and working integrations.
- **Conventions:** Project-specific guidance relevant to the reference material.
- **Metadata:** Pack identity, version, source, and an index of included material.

A curated definition declares named `docs`, `code`, and `examples` groups. Consumers choose the useful subset with `--content`. Each group can use a different source. Git transport currently clones repositories before copying selected files.

Agent instructions and skills can accompany a pack, but reference material is the primary payload. An `AGENTS.md` tells an agent how to work; a context pack gives it material to work from.

## Sources and distribution

Keep the pack format independent of its transport.

| Source              | Intended behavior                                                    |
| ------------------- | -------------------------------------------------------------------- |
| Local filesystem    | Implemented: find and install packs from a directory.                |
| GitHub / Git        | Implemented: find definitions and retrieve content at exact commits. |
| S3 / object storage | Planned: fetch a published snapshot and its metadata.                |
| Static URL          | Planned: fetch definitions and downloadable contents.                |
| API                 | Planned: find and retrieve packs through a compatible protocol.      |

One source can expose one pack or many. A framework repository could publish separate packs for its core API, frontend integration, and deployment guides.

Directories and repositories should be usable package sources themselves. Authors should not need a separate publishing service just to distribute their existing files.

## Installation experience

1. Point the tool at a source.
2. Discover its available packs and select what the project needs.
3. Resolve the requested version to a concrete revision or immutable artifact.
4. Download the docs and source into the project's context directory.
5. Write a local index so agents can find the installed material.
6. Record the resolution so another machine can reproduce the install.

The default is `.context/`, with project-level and per-pack destination overrides. The [installation model](installation.md) explains versioned content directories and destination ownership.

Consumer layout:

```text
project/
  granary.json
  granary-lock.json
  .context/
    INDEX.md
    docs/
      bytefarm/engineering/0.1.0/
        README.md
    repos/
      bytefarm/react/19.2.0/
        ReactClient.js
```

Keep definition version, documented package version, and upstream commits distinct. [Curated definitions](../reference/pack-definition.md) map exact package versions to per-group upstream refs. The lock records concrete commits and selected file hashes.

Installed material is readable offline. Git-backed restoration requires upstream access; local restoration requires unchanged local sources. Updates remain planned.

## Shared protocol

Define a small contract that different sources can satisfy:

- **Discovery:** List available packs and their descriptions.
- **Resolution:** Resolve a pack and version to a concrete artifact or revision.
- **Retrieval:** Fetch its manifest and contents.
- **Provenance:** Identify the original source, documented dependency version, and content integrity.

The same logical pack should work across transports. A local directory need not run an HTTP server; a source adapter can expose the same operations.

Exact schemas, endpoints, archive formats, and authentication behavior remain design work.

## Existing tools to investigate

**skills.sh** is the reference for repo-backed discovery and installation. Its catalog API and hosted collections are potential integration points; a supported installer SDK has not been verified. The [compatibility concept](skills-compatibility.md) records the comparison.

**Context7** is the reference for bringing useful library documentation to agents. This product installs reference material into the workspace, including source where useful.

**Tessl** is another reference from the original discussion. Investigate its past and current context packaging approach before making specific comparisons.

## Initial product slice

The initial slice includes filesystem and Git sources, portable bundles, curated definitions, selectable content, consumer configuration, a lockfile, and generated indexes.

The [standards-pack assessment](standards-packs.md) describes focused engineering and language packs with implemented recommended sets. [Flat presets](../reference/presets.md) compose exact-version components without recursive dependencies.

Use that slice to prove the authoring and agent-consumption experience. Add object storage and protocol-backed HTTP/API sources against the same pack model.

## Open decisions

- Verify whether skills.sh tooling is reusable.
- Finalize source-provider discovery and archive/protocol contracts.
- Define update and removal behavior.
- Add package selectors and a hosted curated catalog.
- Add published snapshot providers and richer version-range selection.
