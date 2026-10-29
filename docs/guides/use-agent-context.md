# Use a pack with your agent

Point the agent at a pack's entry file and let it read relevant topics on demand.

## Prerequisites

- A context pack available on disk
- A coding agent with filesystem reading/search tools

## 1. Identify the entry file

Read the installed `INDEX.md`, then the selected component's `entry` file. Granary itself starts at `.context/INDEX.md` and consumes the TypeScript recommended set.

## 2. Give a retrieval instruction

```text
Read .granary/context/INDEX.md. Use its component entrypoints to select the standards
relevant to this task, then read those pages before changing code.
```

The pack remains useful without a dedicated MCP server or agent plugin.

## 3. Keep the instruction persistent

Add a short pointer to your repository's instruction file when the pack should apply to every task. Keep project-specific commands and boundaries there; detailed reference material stays in the pack.

Installed packs have a generated `INDEX.md` at their output root (`.granary/context/` by default). Point the agent at that index when it needs to discover several packs. Granary's own checkout uses an explicit `.context/` output; consumers do not need that override.

For repository documentation, Almanac keeps root `AGENTS.md` current with separate standards and contributor/public documentation regions. Edit canonical Markdown and run `pnpm docs:index` instead of editing those generated regions directly.

## Verification

Ask the agent which source files support its proposed change. It should identify the applicable pack pages and inspect the relevant implementation, rather than assume the manifest itself contains all the context.
