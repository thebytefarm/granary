<div align="center">
  <img src="assets/banner.svg" alt="Granary — Ship context." width="90%" />
  <p><strong>Give coding agents the docs and source they need, right inside your repo.</strong></p>
  <p>Versioned context packs. Ordinary files. Any agent.</p>
</div>

## Your dependencies come with code. They should come with context.

Coding agents work better when they can read how your tools actually work. The right API reference. The implementation behind an unfamiliar method. An example that matches the version you installed.

**Granary brings that knowledge into your workspace.** Package docs, source, and examples together, then install them alongside the project that needs them. Your agent reads the files with the tools it already uses.

Think local Context7, distributed like packages.

## What we're building

- **Context you can ship.** Bundle useful reference material into reusable packs.
- **Bring your own source.** Install from a directory or GitHub repo, with S3 and compatible URLs/APIs planned.
- **The right version.** Pin context to the dependency version you're building with and reproduce installs across machines.
- **Local by default.** Search installed docs and source offline, directly from the filesystem.
- **Agent independent.** Share the same material across coding agents without a dedicated integration for each one.

The workspace CLI validates catalogs, installs local and Git-backed leaf/composite packs, selects ordinary repository content, and restores pinned content from a lockfile. The npm packages are still coming-soon placeholders.

## How it works

**Package it.** Point Granary at the docs and source worth sharing. A directory or repository can be the package source itself.

**Bring it into the repo.** Select dependencies, content groups, and revisions. Granary copies docs into your chosen directory, keeps reference code hidden and Git-ignored, and records upstream commits and file hashes. `.context/` is the default docs destination.

**Let your agent read.** A generated index points to the installed material. Your agent can inspect the source, search the docs, and use examples from the same version.

One source can publish several packs. One project can install context from several sources. A shared protocol will let repositories, object storage, and APIs expose the same package model.

Read the [product concept](docs/concepts/context-packs.md) for the distribution model, protocol direction, and open decisions.

## Our first context pack

Granary provides seven focused standards components from [packs/](packs/README.md): engineering, Git, documentation, agent instructions, and functional TypeScript, Rust, and Python.

Granary itself consumes only the TypeScript recommended set. `AGENTS.md` routes agents through its [installed context index](.context/INDEX.md). Read [Contributing](contributing/README.md) to get started.

[granary.json](granary.json) declares the recommended presets, ordered member references, selected `dependencies`, and `installDir`. Each pack directory owns its identity, version, and file selection in its own `granary.json`; it can be installed independently. See the [manifest reference](docs/reference/pack-manifest.md).

Recommended TypeScript, Rust, and Python presets compose those independent packs. Shared components install once; each language's functional rules remain scoped to that language.

```sh
CONSUMER="$(mktemp -d)"
pnpm cli add "$PWD" --pack recommended-typescript recommended-rust recommended-python --cwd "$CONSUMER"
pnpm cli list --cwd "$CONSUMER"
```

Read the [preset reference](docs/reference/presets.md) for the composition contract and the [standards assessment](docs/concepts/standards-packs.md) for the pack boundaries.

## Development

Use **Node.js 26 or newer** and the pnpm version pinned in `package.json`.

```sh
pnpm install
pnpm build
pnpm cli --help
pnpm cli about
pnpm cli validate
pnpm cli install
pnpm cli list
pnpm validate
```

| Command                 | Purpose                                               |
| ----------------------- | ----------------------------------------------------- |
| `pnpm build`            | Build packages with tsdown through Turborepo          |
| `pnpm dev`              | Watch package builds                                  |
| `pnpm cli <args>`       | Build and run the local Granary CLI                   |
| `pnpm typecheck`        | Check TypeScript with TypeScript 7's native `tsc`     |
| `pnpm lint`             | Check code with oxlint                                |
| `pnpm format`           | Check formatting with oxfmt                           |
| `pnpm format:fix`       | Apply formatting                                      |
| `pnpm test`             | Build and run tests with Vitest                       |
| `pnpm validate`         | Run typecheck, lint, formatting, and tests            |
| `pnpm docs:index`       | Refresh and stage managed agent-documentation indexes |
| `pnpm docs:index:check` | Check managed documentation indexes for drift         |
| `pnpm changeset`        | Describe a package release                            |

## Documentation

The Ciderpress site includes a product landing page, CLI and config references, local/Git installation guides, a curated React definition, and the contributor standards pack.

```sh
pnpm docs:dev
pnpm docs:build
pnpm docs:serve
```

Use `pnpm docs:dev --headless` in a noninteractive terminal. Start with the [introduction](docs/getting-started/introduction.md), [CLI reference](docs/reference/cli.md), or [project configuration](docs/reference/project-config.md).

Almanac maintains separate standards and contributor/public documentation regions in root `AGENTS.md`. After editing indexed Markdown, run `pnpm docs:index`; `pnpm validate` checks the generated index for drift. Read [Contributing](contributing/README.md) for the authoring workflow.

## Workspace

```text
granary/
  assets/                # README artwork
  granary.json            # Recommended presets and TypeScript-only dependencies
  granary-lock.json       # Exact installed context and file integrity
  packs/                 # Independent manifests and authored material
  .context/              # Installed shared/TypeScript standards
  contributing/          # Repository-specific contributor workflow
  docs/concepts/         # Product direction and design notes
  docs/guides/           # Pack authoring and agent workflows
  docs/reference/        # CLI, manifests, project config, and sources
  public/                # Documentation-site branding
  packages/
    cli/                 # granary-ai package; maltty-powered granary command
    core/                # Private package for pack schemas and source logic
```

**Stack:** Node.js 26+, pnpm workspaces, Turborepo, TypeScript 7's native `tsc`, maltty, tsdown, oxlint, oxfmt, Vitest, Changesets, and Almanac.

## License

[MIT](LICENSE)
