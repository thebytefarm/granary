# Prebuilt packs

Install a recommended set for your language, or browse the individual components. Every set combines shared engineering rules with language-specific standards.

## Install a recommended set

Install the CLI once:

```sh
npm install --global granary-ai
```

The workspace implementation uses the current manifest contract; it has not been published yet. Check out this repository alongside your project:

```sh
gh repo clone thebytefarm/granary ../granary-packs
```

Run one of these commands from your project root using the workspace CLI.

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

Read `.context/INDEX.md` after installation. It links the installed components and records their reading order. Commit `granary.json` and `granary-lock.json`; teammates restore the same material with `granary install`.

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

`packs/granary.json` owns the distributed sets. The repository-root `granary.json` is this project's consumer configuration and installs only TypeScript and shared standards.

## Rule language

The uppercase terms **MUST**, **MUST NOT**, **SHOULD**, **SHOULD NOT**, and **MAY** use RFC 2119/8174 meanings. Authored-code requirements do not apply to generated or vendored output.
