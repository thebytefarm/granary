# granary-ai

## 0.2.0

### Minor Changes

- 44fb338: Add separate maltty-guided workflows for consumer project setup and reusable pack authoring. `granary init` prefills an editable project name from package metadata and can install initial context. `granary create <directory>` authors an explicit pack definition without installing or registering it. Both support `--yes` for scripted scaffolding and preserve existing configuration and locks. Remove the redundant `about` command; use `--help` to discover capabilities.

  Recommend bundled language sets from root project markers and let users confirm their prebuilt selections. Add portable, exact-version `builtin:` sources with offline installation and locked restoration; ship the immutable bytefarm 0.1.0 snapshot in the npm package. Scripted initialization installs only explicit `--preset` selections.

  Detect supported project tools and offer their curated documentation packs before optional Bytefarm standards. Embed ordinary pinned upstream definitions for Next.js, React, TanStack Query, Router, Start, Hono, Zod, and Vercel AI SDK so the picker works in installed distributions without checkout paths.

## 0.1.0

First functional npm release, replacing the `0.0.1` placeholder.

### Context installation

- Install local folders, Git repositories, and recursively composed packs using `granary.json`.
- Add Next.js 15/16 documentation with numeric major, minor, or exact stable versions, such as `granary add nextjs@16`.
- Pin upstream commits and file hashes in `granary-lock.json`; restore the same selection with `granary install`.
- Link installed reference entrypoints directly in a managed region of `AGENTS.md`, preserving existing instructions. No separate generated `INDEX.md`, hooks, or compatibility aliases.
- Default context to `.granary/context/` and retain shared baselines in `.granary/cache/`, both Git-ignored.
- Protect edited files, unsafe paths, and stale operations with preflight checks and rollback on reported write failures.

### Reviewed updates and SDK

- Preview baseline, local, and incoming content; apply explicit decisions without silently overwriting local edits.
- Import `granary()` from `granary-ai` without starting the CLI. Operations return plain typed outcomes.
- Opt into plugins and standards conversion through package subpaths. Export structured standards as JSON, YAML, Markdown, or Greptile rules.
- Include maintenance skills for authored packs, an npm README, MIT license, and repository metadata.

### Requirements and limits

- Requires Node.js 26+ and Git. Supports macOS and Linux.
- Uses the current unified manifest contract; historical development schemas are not supported.
- Website ingestion, hosted registries, and Windows support are not implemented.
