---
'granary-ai': minor
---

Add separate maltty-guided workflows for consumer project setup and reusable pack authoring. `granary init` prefills an editable project name from package metadata and can install initial context. `granary create <directory>` authors an explicit pack definition without installing or registering it. Both support `--yes` for scripted scaffolding and preserve existing configuration and locks. Remove the redundant `about` command; use `--help` to discover capabilities.

Recommend bundled language sets from root project markers and let users confirm their prebuilt selections. Add portable, exact-version `builtin:` sources with offline installation and locked restoration; ship the immutable bytefarm 0.1.0 snapshot in the npm package. Scripted initialization installs only explicit `--preset` selections.

Detect supported project tools and offer their curated documentation packs before optional Bytefarm standards. Embed ordinary pinned upstream definitions for Next.js, React, TanStack Query, Router, Start, Hono, Zod, and Vercel AI SDK so the picker works in installed distributions without checkout paths.
