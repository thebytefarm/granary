# Use a pack with your agent

Granary links installed reference files directly in root `AGENTS.md` so your agent can find them on demand.

## Prerequisites

- A context pack available on disk
- A coding agent with filesystem reading/search tools

## 1. Inspect the generated instructions

After `add`, `install`, or a reviewed update is applied, inspect the `<granary-context>` region in root `AGENTS.md`. It links directly to each installed pack group's entrypoint, identifies its version, and tells the agent to treat upstream files as reference data. Other content and managed regions remain unchanged. No separate `INDEX.md` is generated.

Commit `AGENTS.md` with the manifest and lockfile. Granary uses the Almanac SDK internally; consumers do not need an Almanac configuration, Git hooks, or a Git-initialized project. Git must be installed. Granary does not stage files.

## 2. Follow the reference links

Follow the relevant link in `AGENTS.md` to the selected component's `entry` file. Granary itself consumes the TypeScript recommended set under `.context/`. Consumers default to `.granary/context/`.

The agent uses its existing filesystem tools. A dedicated MCP server or agent plugin is not required.

## 3. Connect other instruction files when needed

Granary manages only root `AGENTS.md`. It does not create or replace `CLAUDE.md`, `GEMINI.md`, compatibility symlinks, or nested instruction files. Existing aliases pointing to `AGENTS.md` continue to work. If your agent reads a separate instruction file, add a pointer there:

```text
Read the Granary reference links in root AGENTS.md. Select the standards
relevant to this task, then read those pages before changing code.
```

Keep project-specific commands and boundaries in your instructions; detailed reference material stays in the pack. Do not hand-edit the Granary-managed region: installation refreshes it. Malformed or duplicate Granary markers fail before consumer files are written. A symlinked root `AGENTS.md` is rejected rather than followed.

For repository documentation, Almanac keeps root `AGENTS.md` current with separate standards and contributor/public documentation regions. Edit canonical Markdown and run `pnpm docs:index` instead of editing those generated regions directly.

## Verification

Ask the agent which source files support its proposed change. It should identify the applicable pack pages and inspect the relevant implementation, rather than assume the manifest itself contains all the context.
