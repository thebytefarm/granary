# Standards packs

Select the shared engineering components and the language rules your project uses. Each of the seven pack directories owns its `granary.json` and material. Root `granary.json` provides three recommended presets that reference those independent packs.

## Components

| Pack                             | Entry                                               |
| -------------------------------- | --------------------------------------------------- |
| `bytefarm/engineering`           | [Functional engineering](engineering/README.md)     |
| `bytefarm/git`                   | [Scoped history and review](git/README.md)          |
| `bytefarm/documentation`         | [Task-oriented writing](documentation/README.md)    |
| `bytefarm/agent-instructions`    | [Operating contracts](agent-instructions/README.md) |
| `bytefarm/typescript-functional` | [Functional TypeScript](typescript/README.md)       |
| `bytefarm/rust-functional`       | [Functional Rust](rust/README.md)                   |
| `bytefarm/python-functional`     | [Functional Python](python/README.md)               |

Each component owns its identity, version, file selection, rules, and reading index. Its manifest describes the pack directly with top-level `name`, `version`, `description`, `entry`, and `files`; paths resolve from its directory. The directory can be copied or distributed as a standalone source.

Install one pack directly from the checkout:

```sh
CONSUMER="$(mktemp -d)"
pnpm cli add "$PWD/packs/rust" --cwd "$CONSUMER"
pnpm cli validate --cwd packs/rust
```

The single pack is selected automatically. Use `pnpm cli add ./packs --list` to discover all seven independent packs.

## Recommended sets

| Composite                         | Language component    |
| --------------------------------- | --------------------- |
| `bytefarm/recommended-typescript` | Functional TypeScript |
| `bytefarm/recommended-rust`       | Functional Rust       |
| `bytefarm/recommended-python`     | Functional Python     |

Every set includes engineering, Git, documentation, agent instructions, and its language component, in that order. Preset members specify a source directory, identity, and exact version; the referenced pack's manifest owns its payload. Shared leaves install once when multiple sets are selected. Language-specific rules apply only to files in that language.

From a Granary checkout, install a set into a fresh consumer:

```sh
CONSUMER="$(mktemp -d)"
pnpm cli add "$PWD" --pack recommended-typescript --cwd "$CONSUMER"
pnpm cli list --cwd "$CONSUMER"
```

Read the consumer's `.context/INDEX.md` for canonical entrypoints and reading order. Selecting all three sets installs seven unique components. Validate the provider declarations from the repository root with `pnpm cli validate`.

## Granary's own context

Granary's root `dependencies` selects only `bytefarm/recommended-typescript`. Its installed index and agent standards region contain those five components. Repository-specific commands, authorization, and release workflow live in `AGENTS.md` and `contributing/`.

Standalone packs describe themselves; the root catalog composes recommended presets and records Granary's dependencies. Consumer-only projects can declare dependencies without providing a pack. Flat preset definitions and older consumer configurations remain supported reader formats, exercised through test fixtures.

## Rule language

The uppercase terms **MUST**, **MUST NOT**, **SHOULD**, **SHOULD NOT**, and **MAY** use RFC 2119/8174 meanings. Authored-code requirements do not apply to generated or vendored output.
