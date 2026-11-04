# Granary context packs

Your project uses a particular version of a tool. A coding agent may know a different version, and your team's conventions may not exist in its training data at all. Links and pasted excerpts help for one conversation; the next agent starts without them.

Granary copies the docs, source, and examples you choose into your repository and links their entrypoints directly in `AGENTS.md`. Install a selection from a local directory or Git repository; the agent reads it with its existing search tools. The lock records which upstream commits and bytes you installed, so teammates can restore the same material.

## What is a context pack?

A context pack is a selection of reference files an agent can read locally. It might contain a library's API reference and implementation, or your team's engineering standards and examples. A reusable `granary.json` names the pack and selects its files or members.

Upstream authors do not need to adopt Granary. Your project's manifest can select ordinary files from an existing repository. You own the installed copies and can customize them; later upstream changes go through review rather than overwriting those edits.

Project setup and pack authoring are different tasks. `granary init` creates consuming configuration at a project's root and can install initial context. `granary create <directory>` describes reusable reference material in an explicit existing directory without installing or registering it. Both use `granary.json`, but a consumer's editable project name is not a request to publish or author a pack.

The `granary-ai` npm package provides local/Git installation and locked restoration through its CLI and SDK. Website retrieval and on-demand CLI reading are separate future work, not prerequisites for using installed packs. No central registry is required.

## What ships in a pack

- **Docs:** API references, guides, architecture notes, and explanations.
- **Source:** Core implementation files that help an agent understand actual behavior.
- **Examples:** Usage patterns and working integrations.
- **Conventions:** Project-specific guidance relevant to the reference material.
- **Metadata:** Pack identity, version, source, and an index of included material.

A curated pack composes named members under `packs`. Each can select a different source and set of files. Consumers choose declared members through source locators. Git transport clones repositories before copying selected files.

Agent instructions and skills can accompany a pack, but reference material is the primary payload. An `AGENTS.md` tells an agent how to work; a context pack gives it material to work from.

The [document-kind model](standards-documents.md) distinguishes ordinary context from structured standards within a pack. Standards retain readable MUST/MAY wording and extractable rationale, examples, and enforcement markers. Shipped [maintenance skills](pack-maintenance.md) guide authoring, local customization, reviewed upstream updates, and contributions back to a pack's source.

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
5. Link installed entrypoints in root `AGENTS.md` so agents can find the material.
6. Record the resolution so another machine can reproduce the install.

The default is `.granary/context/`, with project-level and per-pack destination overrides. Generated context and cache files are Git-ignored; the manifest and lockfile stay at the project root. The [installation model](installation.md) explains versioned content directories and destination ownership.

Consumer layout:

```text
project/
  AGENTS.md
  granary.json
  granary-lock.json
  .granary/
    .gitignore
    context/
      github/vercel/next.js/v15.5.0/
        docs/
    cache/
      baselines/
```

Keep authored version labels and upstream commits distinct. [Curated packs](../reference/pack-definition.md) select independent sources with explicit revisions. The lock records concrete commits, composition, destinations, and selected file hashes.

Installed material is readable offline. Git-backed restoration requires upstream access; local restoration requires unchanged local upstream sources. Reviewed updates retain accepted customizations separately from upstream provenance.

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

The initial slice includes filesystem and Git sources, portable bundles, curated definitions, selectable content, consumer configuration, a lockfile, and managed agent reference links.

The [standards-pack assessment](standards-packs.md) describes focused engineering and language packs with implemented recommended sets. [Presets](../reference/presets.md) compose declared members recursively without duplicating their material.

Use that slice to prove the authoring and agent-consumption experience. Add object storage and protocol-backed HTTP/API sources against the same pack model.

## Open decisions

- Verify whether skills.sh tooling is reusable.
- Finalize source-provider discovery and archive/protocol contracts.
- Define update and removal behavior.
- Add package selectors and a hosted curated catalog.
- Add published snapshot providers and richer version-range selection.
