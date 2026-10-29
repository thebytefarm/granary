# Granary vision

Give coding agents the right docs, source, and examples for the tools a project actually uses. Install that material as ordinary files, or retrieve the relevant docs on demand through the CLI.

**This is product direction, not a release checklist.** Use [TASKS.md](TASKS.md) to capture work and choose the next shipping cut. The sections below include capabilities that do not exist yet.

## Two ways to get context

### Install it

Choose a pack, source, and revision. Granary brings the selected docs, code, and examples into the project, records where they came from, and makes them discoverable to agents.

Use this for material a project needs repeatedly, offline reading, reproducible team context, and code or examples the consumer intends to adopt. Installation should not require an upstream Granary manifest.

### Read it on demand

Point the CLI at a known library, GitHub repository, or documentation domain. Find and read relevant pages without first installing an entire pack into the project.

This is the Context7-like experience, delivered through the CLI: resolve the source, find the relevant material, and return useful content with citations and revision or retrieval information. It need not generate an answer with an LLM to be useful.

On-demand reads must not silently change project dependencies or locks. A retrieval cache is not an installed, pinned pack. A useful result should be adoptable into a pack later.

**Both paths should share source discovery, content selection, and provenance rather than become unrelated products.**

## Curated packs that work out of the box

Provide maintained definitions for common tools, starting with a concrete framework such as Next.js. A user should not need to inspect its repository layout or figure out which documentation source matches the code.

A curated pack can bring together:

- Reference documentation and guides.
- Relevant implementation files from a code repository.
- Examples and integrations.
- Source revisions and the documented release, where that relationship can be verified.

The definition can point to upstream material rather than copy it into this repository. Prebuilt can mean a ready-to-use definition; it does not require hosting a complete payload. Published snapshots are a separate distribution choice.

Standards packs remain a core use case, but they are not the limit of what Granary installs. Ordinary docs and source do not require XML or a standards plugin.

## Website documentation sources

Support documentation hosted outside Git repositories. Use the discovery material a site provides:

| Input                    | Intended use                                                                                   |
| ------------------------ | ---------------------------------------------------------------------------------------------- |
| `llms.txt`               | Find the site's agent-oriented documentation map and referenced pages.                         |
| `llms-full.txt`          | Consume a site's consolidated documentation when supplied.                                     |
| Sitemap or sitemap index | Discover candidate documentation URLs when a useful document map is unavailable or incomplete. |
| Explicit URLs            | Read selected pages without requiring any discovery file.                                      |

These sources can complement each other. A sitemap is a discovery list, not the documentation itself. A consolidated file is not proof of complete or version-correct coverage. Neither filename is guaranteed to exist on every site.

The desired result is readable, source-linked documentation with useful page boundaries, headings, links, and examples preserved. Report inaccessible pages and incomplete retrieval rather than presenting a partial collection as the full docs.

Keep retrieval bounded: selected sections, URL/domain boundaries, page and size limits, canonical URL deduplication, and explicit version choices. Respect site access policies and upstream licensing. Do not make an unbounded crawler a prerequisite for the first website source.

Website content can change without a release. Record original URLs, retrieval information, and content hashes; do not imply the same reproducibility as a pinned Git commit unless an actual snapshot is retained.

## A discoverable catalog

Let people and agents browse supported sources by area: frameworks, libraries, infrastructure, languages, and standards. Show what each entry actually supplies rather than claiming generic support for a product.

A useful catalog entry identifies the upstream repository or domain, available docs/code/examples, supported revisions or releases, selection boundaries, and maintenance status. Distinguish maintained entries from experimental entries and arbitrary sources that the user can configure themselves.

**Start with declarative data.** Checked-in JSON definitions may be enough to supply the initial catalog. Browse, inspect, installation, and on-demand reading should consume the same definitions rather than maintain separate lists.

The exact schema and loading mechanism remain design work. Reuse existing pack definitions where they fit; do not introduce another competing manifest or an executable plugin per library merely to record URLs and file selections.

## SDK and plugins

The approved [client and plugin direction](docs/concepts/client-plugins.md) separates the minimal `createGranary()` client from the composed `granary()` entrypoint. Standards ships in the default composition. Plugins add typed capabilities and own their document interpretation, including parsing.

Keep three concerns distinct:

- Pack and catalog definitions describe what material to retrieve.
- Source adapters retrieve material from repositories, directories, or websites.
- Plugins interpret content and expose additional APIs.

A new catalog entry should usually be data, not new code. Reading ordinary documentation should not require a semantic plugin. Installing content must not automatically execute code supplied by that content.

## Current reality

| Area                                                                   | Status                                                                                            |
| ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Local/Git docs, source, examples, and selected binary files            | Implemented in the workspace installer, including sources without manifests.                      |
| Revision locking, restoration, consumer edits, and reviewed updates    | Implemented; see the references for guarantees and limits.                                        |
| Shipped engineering and language standards packs                       | Implemented.                                                                                      |
| Standards parsing and JSON/Markdown exports                            | Implemented through standalone functions and CLI commands.                                        |
| Factory client, plugin API, and YAML conversion                        | Implemented in the workspace; constructors return Results. YAML uses JSON-compatible flow syntax. |
| Maintained framework catalog, including Next.js                        | Proposed. Existing arbitrary Git installation is not a curated framework integration.             |
| Website ingestion through document maps and sitemaps                   | Proposed.                                                                                         |
| On-demand documentation discovery, search, and reading through the CLI | Proposed.                                                                                         |
| Hosted catalog or prebuilt snapshot service                            | Optional future distribution; not required for the first catalog.                                 |

## Ship in useful slices

Prove one end-to-end workflow at a time. Candidate slices, not a promise to build all of them before release:

1. Ship a reliable repository-backed install and restore workflow with one curated framework definition.
2. Support one bounded website documentation source, starting from its provided document map or consolidated text.
3. Expose on-demand reading through the CLI using the same source definition, then add focused discovery/search.
4. Grow the supported catalog from real usage and maintenance evidence.

The client/plugin work should support those outcomes, not become a separate framework project. No hosted registry, semantic-search infrastructure, automatic XML authoring, or broad plugin ecosystem is required to prove the product.

## Decisions still to make

- Which framework and user workflow define the next release's acceptance checklist?
- What is the smallest catalog definition that serves both installation and on-demand reading?
- How should a user select versions when a documentation domain only publishes current content?
- What should retrieval cache freshness and explicit refresh mean?
- How much local search is useful before considering an external search service?
- Who maintains curated entries, and what evidence makes an entry supported?

Record decisions and actionable follow-ups in [TASKS.md](TASKS.md). Promote bounded tasks to GitHub issues or a project when useful; keep this page focused on product direction.
