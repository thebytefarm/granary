# Tasks

> Repo task list and idea inbox. Capture here first; promote to GitHub issues or a project when useful.

Read [VISION.md](VISION.md) for product direction, current capabilities, and future ideas. This file tracks actionable slices, not a commitment to implement the whole vision.

## Shipping focus

Choose the smallest useful release before adding more features. An idea is not a commitment or a release blocker. Keep unrelated work out of the shipping cut.

Existing implementation is in progress, not release-ready. Do not discard it or expand it without agreeing on scope.

## Active

### [T1] Agree on the next shipping cut

- **Status:** todo
- **Created:** 2026-10-19
- **Notes:**
  - We are adding too much instead of shipping. Separate required user outcomes from follow-up ideas.
  - Review the current unified manifest work and choose what must ship now, what needs finishing, and what can wait.
  - Done when the release has a short acceptance checklist and explicit exclusions. Do not make every implemented capability a requirement.
  - Use the install/on-demand workflows in `VISION.md` to prioritize outcomes rather than build every proposed abstraction.

### [T2] Rewrite the context-pack concept opening

- **Status:** todo
- **Created:** 2026-10-19
- **Notes:**
  - Plannotator feedback on `docs/concepts/context-packs.md`: the opening package-manager explanation does not work.
  - Explain the concrete user problem and first useful result. Keep it consistent with the agreed shipping cut.

### [T3] Restore a green release baseline

- **Status:** todo
- **Created:** 2026-10-19
- **Notes:**
  - Earlier blockers were syntax errors in `packages/core/src/sources/unified-document.ts` and unfinished formatting.
  - Resolved the syntax and formatting failures while documenting the approved client/plugin API. `pnpm validate`, `pnpm build`, and `pnpm docs:build` now pass (179 tests passed; 2 optional skips).
  - Finish verification of the agreed shipping cut without adding capabilities.
  - Refresh installed standards through the reviewed-update flow after the build works; this pass changes authored packs, not locked installed snapshots.
  - Keep the baseline green through the chosen release work; installed-standards refresh remains pending.

### [T4] Prove a curated framework pack

- **Status:** todo
- **Created:** 2026-10-19
- **Notes:**
  - Backlog candidate, not an automatic release blocker. Next.js is the suggested first integration.
  - Supply a maintained definition selecting useful docs, code, and examples without requiring upstream Granary metadata.
  - Done when a fresh project can discover, install, and restore the selection with honest release/revision provenance.

### [T5] Retrieve one website's documentation

- **Status:** todo
- **Created:** 2026-10-19
- **Notes:**
  - Support `llms.txt`, consolidated `llms-full.txt`, explicit pages, and sitemap discovery in bounded stages.
  - Start with one real site and its provided discovery material, not a general crawler.
  - Done when selected content preserves examples and source URLs, records retrieval identity, and reports missing pages and limits.

### [T6] Read documentation on demand through the CLI

- **Status:** todo
- **Created:** 2026-10-19
- **Notes:**
  - Resolve a known library, GitHub repository, or documentation domain and return relevant docs without installing a project dependency.
  - Share definitions and retrieval with installation. Keep caching separate from project locks.
  - Done when an agent can find and read a page with source/revision information; exact command syntax and search implementation remain open.

### [T7] Browse supported documentation sources

- **Status:** todo
- **Created:** 2026-10-19
- **Notes:**
  - Start with checked-in declarative definitions, potentially JSON, rather than a hosted catalog service.
  - List sources by area and show available docs/code/examples, versions, and maintenance status.
  - Done when browsing and source inspection use the same definitions as installation; distinguish curated support from arbitrary-source compatibility.

## Ideas

Capture rough thoughts here without designing or implementing them yet. When an idea becomes a task, give it the next `T<n>` ID and record the problem, intended outcome, and a small acceptance checklist. Add the GitHub issue link when promoted; keep these IDs stable.

## Done
