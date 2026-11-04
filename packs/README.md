# Prebuilt packs

Install a recommended set for your language, or browse the individual components. Every set combines shared engineering rules with language-specific standards.

## Install a recommended set

Install the CLI once:

```sh
npm install --global granary-ai
```

Check out the pack sources alongside your project; the CLI itself is installed from npm and needs no build:

```sh
gh repo clone thebytefarm/granary ../granary-packs
```

Run one of these commands from your project root.

### TypeScript

Factories, immutable values, typed Results, exhaustive matching, and explicit contracts.

```sh
granary add file:../granary-packs/packs#recommended-typescript
```

### Rust

Ownership, native Result and Option, enums, iterator composition, and isolated effects.

```sh
granary add file:../granary-packs/packs#recommended-rust
```

### Python

Typed Results, immutable domain data, pure transformations, and explicit adapter boundaries.

```sh
granary add file:../granary-packs/packs#recommended-python
```

Each set includes engineering, Git, documentation, agent instructions, and its language component, in that order. Shared components install once when you select multiple sets. Language-specific rules apply only to files in that language.

Follow the installed component links in root `AGENTS.md` after installation. Commit `AGENTS.md`, `granary.json`, and `granary-lock.json`; teammates restore the same material with `granary install`.

## Components

### Languages

| Pack                             | Entry                                                       |
| -------------------------------- | ----------------------------------------------------------- |
| `bytefarm/typescript-functional` | [Functional TypeScript](/packs/languages/typescript/README) |
| `bytefarm/rust-functional`       | [Functional Rust](/packs/languages/rust/README)             |
| `bytefarm/python-functional`     | [Functional Python](/packs/languages/python/README)         |

### Shared standards

| Pack                          | Entry                                                          |
| ----------------------------- | -------------------------------------------------------------- |
| `bytefarm/engineering`        | [Functional engineering](/packs/shared/engineering/README)     |
| `bytefarm/git`                | [Scoped history and review](/packs/shared/git/README)          |
| `bytefarm/documentation`      | [Task-oriented writing](/packs/shared/documentation/README)    |
| `bytefarm/agent-instructions` | [Operating contracts](/packs/shared/agent-instructions/README) |

Each component owns its identity, version, rules, and reading index. Its manifest declares `name`, `version`, `description`, and explicit standards document classifications. Markdown is included recursively with `README.md` as the entrypoint; no authored file list is needed. The directory can be copied or distributed as a standalone source.

To install an individual component from a local Granary checkout, point the CLI at its directory:

```sh
granary add ./packs/rust --cwd /path/to/your-project
```

The single pack is selected automatically. Use `granary add ./packs --list` from that checkout to inspect the declared recommended sets and their members.

## Recommended sets

| Composite                         | Language component    |
| --------------------------------- | --------------------- |
| `bytefarm/recommended-typescript` | Functional TypeScript |
| `bytefarm/recommended-rust`       | Functional Rust       |
| `bytefarm/recommended-python`     | Functional Python     |

For a polyglot project, declare several sets with a shared destination in `granary.json`:

```json
{
  "name": "polyglot-project",
  "packs": {
    "file:../granary-packs/packs#recommended-typescript": { "output": ".context/docs/bytefarm" },
    "file:../granary-packs/packs#recommended-rust": { "output": ".context/docs/bytefarm" },
    "file:../granary-packs/packs#recommended-python": { "output": ".context/docs/bytefarm" }
  }
}
```

Run `granary install`. Selecting all three sets at the same destination installs seven unique components. The lockfile records their exact source revisions, membership, and file integrity.

`packs/granary.json` owns the distributed sets. The repository-root `granary.json` is this project's consumer configuration and adopts React documentation plus bundled TypeScript and shared standards.

## Rule language

The uppercase terms **MUST**, **MUST NOT**, **SHOULD**, **SHOULD NOT**, and **MAY** use RFC 2119/8174 meanings. Authored-code requirements do not apply to generated or vendored output.

## Curated tool packs

Install official tool documentation through ordinary pack definitions. Each directory owns a `granary.json`; no separate recipe format or package is required. Definitions select upstream files rather than copying documentation into this repository.

| Directory         | Selected material                                         |
| ----------------- | --------------------------------------------------------- |
| `nextjs`          | Next.js guides and API reference                          |
| `react`           | React learning material, reference, and warnings          |
| `tanstack-query`  | TanStack Query for React                                  |
| `tanstack-router` | TanStack Router guides and reference                      |
| `tanstack-start`  | TanStack Start framework docs and shared Router reference |
| `hono`            | Hono website documentation                                |
| `zod`             | Zod documentation without the blog archive                |
| `ai-sdk`          | Vercel AI SDK guides, reference, and providers            |

From a Granary checkout, install into a separate consumer:

```sh
pnpm cli add "$(pwd)/packs/hono" --cwd /path/to/consumer
```

The relative source resolves from the consumer directory. Use an absolute path to the checkout's `packs/hono` directory when the consumer is elsewhere:

```sh
granary add /path/to/granary/packs/hono
```

Omit a member suffix to install the complete definition, or append `#docs` to select its documentation member. Selection preserves upstream-relative paths beneath the member's `docs` destination. See [pack definitions](../docs/reference/pack-definition.md) for source composition and [CLI initialization](../docs/reference/cli.md#initialize-a-project) for the existing setup picker.

### Snapshot contract

These definitions pin reviewed file selections to exact upstream commits. They do not infer installed dependency versions, track `latest`, or claim that a website snapshot matches an npm release. Installation requires network access and Git; subsequent restoration retrieves the locked commits and verifies file hashes. Upstream examples, site assets, and all cross-page links are not guaranteed to be included or runnable offline. Selected Markdown and MDX are context, not executed application code.

Each selection retains the upstream license file. Upstream authors own their material; follow its license and attribution terms when sharing installed content. These tool packs are independent of the existing engineering standards and are not added to the language recommended sets or the immutable `builtin:bytefarm@0.1.0` snapshot.

`granary init` detects supported tools from the selected root's package dependencies and preselects their documentation packs. The picker also offers optional Bytefarm standards. Definitions are embedded in the CLI; consumers do not need this checkout. Confirmed tool selections write ordinary inline pack definitions with pinned upstream sources into `granary.json`, not paths into the npm installation. To select packs without prompts, use `granary init --yes --preset hono zod`. Bare `--yes` still creates an empty scaffold.
