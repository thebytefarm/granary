# Granary

Granary installs versioned docs and source as local context packs for coding agents. Local/Git installation, content selection, and locked restoration work in the workspace CLI. Product direction lives in `docs/concepts/context-packs.md`.

## Stack

Node.js 26+, pnpm workspaces, Turborepo, TypeScript 7 (native `tsc`), maltty, tsdown, oxlint, oxfmt, Vitest, and Changesets. `package.json` and `pnpm-lock.yaml` record tooling versions.

## Structure

- `packages/cli`: `granary-ai`, exposing the `granary` executable through maltty.
- `packages/core`: private pack schema and installation logic package.
- `docs/concepts`: product direction and unresolved design decisions.
- `docs/examples`: checked-in curated definitions demonstrating separate sources.
- `assets`: README artwork.

## Commands

Run from the repository root. Use pnpm filters for package-specific work.

```sh
pnpm build
pnpm cli --help
pnpm docs:dev --headless
pnpm docs:build
pnpm docs:index
pnpm validate
pnpm --filter granary-ai test
```

`pnpm validate` runs package and docs-config typechecks, lint, format, tests, docs link checks, and Almanac index checks. CLI integration tests execute the built entrypoint; Turborepo builds it before testing. Use `pnpm docs:build` for production-site validation when changing the site.

Tests always execute to inspect current root standards and available language tools. Rust examples compile when rustc is installed. Python syntax and native examples run with Python; returns execution and strict mypy-plugin checks report skips when their dependencies are unavailable.

## House style

Write pure, immutable, declarative TypeScript with function declarations, factories, composition, named exports, and object Results. Start at the [installed context index](.context/INDEX.md), then read the [engineering component](.context/docs/bytefarm/engineering/0.1.0/README.md) and [functional TypeScript component](.context/docs/bytefarm/typescript-functional/0.1.0/README.md).

## Boundaries

### Always

<always>

- Read [change discipline](.context/docs/bytefarm/engineering/0.1.0/change-discipline.md) and each applicable standard before changing files.
- Refresh the managed documentation regions with `pnpm docs:index` after changing indexed Markdown.
- Follow the checked-in pack when an older sibling repository uses a conflicting pattern.
- Resolve new dependencies at latest and record them in the lockfile.
- Run `pnpm validate` and `pnpm build` before claiming completion.
- Add a changeset for changes to the published CLI package.
- Bump the CLI version before publishing; `0.0.1` is already on npm.

</always>

### Ask first

<ask>

- Adding dependencies or packages.
- Changing public APIs, protocol schemas, authentication, or environment schemas.
- Deleting files or removing exports.
- Publishing packages or changing release configuration.

</ask>

### Never

<never>

- Commit secrets or publish `.env` files.
- Bypass hooks or commit directly to `main`.
- Use ESLint, Prettier, or the legacy JavaScript TypeScript compiler; use oxlint, oxfmt, and TypeScript 7's native `tsc`.
- Write classes, ternaries, `let`, authored `throw`/`try/catch`, or mutable application collections; see the pack's TypeScript standards.
- Mutate arguments or shared state, use `any`, or add unchecked casts.
- Copy private application or operational instructions into the reusable standards pack.

</never>

## Git

Use [Conventional Commits](.context/docs/bytefarm/git/0.1.0/commits.md) and [scoped pull requests](.context/docs/bytefarm/git/0.1.0/pull-requests.md). Use `type/short-description` branches, package paths or cross-cutting areas as commit scopes, and Summary, Changes, and Testing sections in PRs.

## Documentation

Each directory under `packs/` owns an independent `granary.json`. Root `granary.json` composes recommended presets and consumes only `bytefarm/recommended-typescript` into `.context/`. Read every applicable installed standard before changing code or documentation. Exported functions require multiline JSDoc; follow the canonical JSDoc page for examples and private declarations.

The installed recommended set contains shared components and TypeScript mechanics. Rust and Python packs are distribution material; read their authored rules only when editing their source examples. Repository-specific commands, dependency approval, and release authorization remain in these instructions.

Almanac generates the two regions below from `almanac.json`. Use the standards region for engineering rules and the documentation region for contributor guides and public product references. Read the relevant pages in full; the index routes retrieval and does not replace their rules. Preserve both regions and the Turborepo-managed block.

### Contributing standards

<standards-index>

.context/docs/bytefarm/agent-instructions/0.1.0/README.md: Give agents a short operating contract and a map to the canonical rules for their current task.
.context/docs/bytefarm/agent-instructions/0.1.0/context-routing.md: Read selected preset components in order and apply each language’s rules only to its own files.
.context/docs/bytefarm/agent-instructions/0.1.0/instructions.md: Keep operating instructions short and route detailed rules to canonical reference material.
.context/docs/bytefarm/documentation/0.1.0/README.md: Choose a page shape from the reader's task. Keep its contracts accurate when copied into a local context pack.
.context/docs/bytefarm/documentation/0.1.0/diagrams.md: Show one relationship clearly using a small Mermaid diagram or a text tree for file layout.
.context/docs/bytefarm/documentation/0.1.0/formatting.md: Keep Markdown portable across copied packs, with concise metadata and examples readers can execute.
.context/docs/bytefarm/documentation/0.1.0/guides.md: Document a task with prerequisites, ordered actions, an observable result, and fixes for known failures.
.context/docs/bytefarm/documentation/0.1.0/quickstarts.md: Take a new reader to one working result in at most five steps, with executable commands and clear output.
.context/docs/bytefarm/documentation/0.1.0/references.md: Describe caller-facing contracts precisely: inputs, defaults, outputs, failures, limits, and valid examples.
.context/docs/bytefarm/documentation/0.1.0/runbooks.md: Make repeatable operating procedures verifiable at each step, with explicit rollback and escalation paths.
.context/docs/bytefarm/documentation/0.1.0/standards.md: Write normative rules with reasons, focused examples, and an honest account of automated and manual enforcement.
.context/docs/bytefarm/documentation/0.1.0/troubleshooting.md: Organize failures by recognizable symptoms, give a bounded fix, and show how to verify recovery.
.context/docs/bytefarm/documentation/0.1.0/tutorials.md: Teach through a bounded build: each step changes something the reader can inspect and explains one concept.
.context/docs/bytefarm/documentation/0.1.0/writing.md: Assign every page a reader task and keep contributor rules separate from product explanation.
.context/docs/bytefarm/engineering/0.1.0/README.md: Shared rules for pure domain logic, immutable values, explicit failures, and resource-owning adapters. Apply these...
.context/docs/bytefarm/engineering/0.1.0/change-discipline.md: Tie each edited line to an observable outcome and preserve unrelated behavior.
.context/docs/bytefarm/engineering/0.1.0/comments.md: Explain hidden constraints and required ordering without restating the surrounding code.
.context/docs/bytefarm/engineering/0.1.0/dependencies.md: Evaluate capability, typing, maintenance, and licensing before expanding the dependency vocabulary.
.context/docs/bytefarm/engineering/0.1.0/errors-as-values.md: Represent expected failures as typed outcomes and contain external exception behavior at adapters.
.context/docs/bytefarm/engineering/0.1.0/functional-design.md: Compose pure transformations and isolate effects behind explicit resource capabilities.
.context/docs/bytefarm/engineering/0.1.0/immutability.md: Return new domain values and keep mutable resource handles separate from application state.
.context/docs/bytefarm/engineering/0.1.0/testing.md: Test consequential decisions and real boundaries with observable success and failure contracts.
.context/docs/bytefarm/git/0.1.0/README.md: Keep history and review scoped to an explainable change.
.context/docs/bytefarm/git/0.1.0/commits.md: Describe one scoped change and preserve the consumer repository’s history and release rules.
.context/docs/bytefarm/git/0.1.0/pull-requests.md: Keep reviews scoped, verification evidence accurate, and follow-up discussion continuous.
.context/docs/bytefarm/typescript-functional/0.1.0/README.md: Use immutable values, declared functions, factories, typed Results, and exhaustive matching. Apply this pack to...
.context/docs/bytefarm/typescript-functional/0.1.0/comments.md: Explain call-site behavior in multiline JSDoc, demonstrate public usage, and identify private declarations.
.context/docs/bytefarm/typescript-functional/0.1.0/conditionals.md: Exit invalid paths with guards and handle closed variants through exhaustive matching.
.context/docs/bytefarm/typescript-functional/0.1.0/errors.md: Carry failure as a typed Result, contain third-party exceptions, and classify failures without text matching.
.context/docs/bytefarm/typescript-functional/0.1.0/file-structure.md: Assign modules to their owning capability and keep package entrypoints deliberate and shallow.
.context/docs/bytefarm/typescript-functional/0.1.0/functions.md: Make operations findable with declarations, explicit contracts, named inputs, and a single responsibility.
.context/docs/bytefarm/typescript-functional/0.1.0/naming.md: Name concrete operations and domain values, with casing that stays predictable across platforms.
.context/docs/bytefarm/typescript-functional/0.1.0/paradigm.md: Build behavior from immutable functions, inject resources through factories, and isolate effects in adapters.
.context/docs/bytefarm/typescript-functional/0.1.0/state.md: Produce new values for state changes and keep mutable resource handles separate from installation data.
.context/docs/bytefarm/typescript-functional/0.1.0/testing.md: Prove observable contracts with real local files and processes, reserving test doubles for external services.
.context/docs/bytefarm/typescript-functional/0.1.0/types.md: Validate external values, retain readonly contracts, and represent source variants with discriminated unions.
.context/docs/bytefarm/typescript-functional/0.1.0/utilities.md: Use the existing utility vocabulary and make pipeline stages and I/O concurrency explicit.

</standards-index>

### Contributor and public documentation

<docs-index>

README.md: Coding agents work better when they can read how your tools actually work. The right API reference. The...
contributing/README.md: Before editing Granary, identify the behavior you intend to change and read the rules for that part of the CLI or...
contributing/agent-context.md: Start a repository task at root AGENTS.md. It owns commands and permission boundaries and routes standards retrieval...
docs/concepts/context-packs.md: Install versioned docs and source into your repo so coding agents can work from local reference material.
docs/concepts/installation.md: Granary installs selected reference material into a project-owned .context/ directory.
docs/concepts/skills-compatibility.md: Granary borrows skills' source-based installation experience while defining a separate reference-material contract.
docs/concepts/standards-packs.md: Split the engineering reference into independent packs, then select a recommended preset for each language. Each of...
docs/getting-started/introduction.md: Granary brings the docs and source a coding agent needs into the repository where it works.
docs/getting-started/quick-start.md: Build Granary locally, validate its catalog, and restore the TypeScript context it consumes.
docs/getting-started/status.md: Local/Git installation, content selection, and pinned restoration are implemented in the workspace CLI.
docs/guides/create-pack.md: Describe an existing directory with granary.json and validate its metadata.
docs/guides/install-packs.md: Install selected docs and source from local directories or Git repositories with the workspace CLI.
docs/guides/use-agent-context.md: Point the agent at a pack's entry file and let it read relevant topics on demand.
docs/reference/cli.md: The workspace CLI supports structured catalogs, local/Git leaf and composite installation, explicit repository...
docs/reference/core-api.md: @granary/core exposes schemas, pack discovery, installation, and locked restoration to this workspace; it is not a...
docs/reference/pack-definition.md: granary.pack.json describes upstream content rather than bundling the payload itself. It keeps pack identity,...
docs/reference/pack-manifest.md: An installable pack's granary.json describes the pack itself. Its identity and version are top-level fields; file...
docs/reference/presets.md: Structured manifests express presets as named composite packs with ordered includes, described in the manifest...
docs/reference/project-config.md: granary.json records the context a project consumes under dependencies. The same document can declare provided...
docs/reference/sources.md: Local directories and Git repositories supply definitions and material. A curated definition can use a different...

</docs-index>

| Task                | Read                                                                              |
| ------------------- | --------------------------------------------------------------------------------- |
| Any code change     | `.context/docs/bytefarm/engineering/0.1.0/change-discipline.md`                   |
| TypeScript          | `.context/docs/bytefarm/typescript-functional/0.1.0/README.md` → applicable pages |
| Dependencies        | `.context/docs/bytefarm/engineering/0.1.0/dependencies.md`                        |
| Tests               | `.context/docs/bytefarm/typescript-functional/0.1.0/testing.md`                   |
| Documentation       | `.context/docs/bytefarm/documentation/0.1.0/writing.md` and `formatting.md`       |
| Agent instructions  | `.context/docs/bytefarm/agent-instructions/0.1.0/instructions.md`                 |
| Pack updates        | The authored component's README and `granary.json`                                |
| Product behavior    | `docs/concepts/context-packs.md`                                                  |
| Pack configuration  | `docs/reference/pack-manifest.md`                                                 |
| Curated definitions | `docs/reference/pack-definition.md`                                               |
| Example definition  | `docs/examples/react/granary.pack.json`                                           |

For installer design, read `docs/reference/cli.md`, `docs/reference/project-config.md`, and `docs/reference/sources.md`. The docs site's source configuration is `ciderpress.config.ts`.

massaman is installed for object Results, matching, and utilities. type-fest is not installed; ask before adding it. oxlint enforces configured rules, not every rule in the standards pack.

<!-- BEGIN:turborepo-agent-rules -->

# This is NOT the Turborepo you know

Turborepo configuration, task behavior, and CLI commands can vary between installed versions and may differ from your training data. Resolve the `turbo` package from this file's directory or relevant workspace; in monorepos, it may not be visible from the repository root. For example, run `node -p "require.resolve('turbo/package.json')"` from a workspace that depends on `turbo`.

Read `docs/README.md` inside that installed package first, then read the relevant pages from its `docs/` directory before changing Turborepo configuration or commands. Heed deprecation notices. These bundled docs match the installed package version and are available without network access.

This block is written and re-added by `turbo` before repository-scoped commands when an AI agent is detected. In the Turborepo source repository, its template is defined in `crates/turborepo-cli/src/cli/agent_guidance.rs`. Removing the managed block while updates are enabled means a later qualifying invocation will add it again. Set `"agentGuidance": false` in the root `turbo.json` or `turbo.jsonc` to opt out; this does not remove an existing block. Keep the block committed with your work to avoid an uncommitted change on the next agent invocation.
<!-- END:turborepo-agent-rules -->
