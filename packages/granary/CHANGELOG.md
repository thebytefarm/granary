# granary-ai

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
