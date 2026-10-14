# CLI

The workspace CLI supports structured catalogs, local/Git leaf and composite installation, explicit repository selections, locked restoration, and listing through maltty. Published npm packages remain placeholders.

```sh
pnpm cli --help
pnpm cli --version
pnpm cli validate
pnpm cli add . --list
pnpm cli install
pnpm cli list
```

| Command        | Behavior                                                               |
| -------------- | ---------------------------------------------------------------------- |
| `about`        | Describe Granary's implemented capabilities                            |
| `validate`     | Validate a catalog and local leaf entries, or standalone pack fields   |
| `add <source>` | Install selected packs, write consumer config and a lockfile           |
| `install`      | Resolve initially declared dependencies or restore their existing lock |
| `list`         | Display locked identity, version, content groups, and destination      |

Structured `validate` checks declared local payloads and entrypoints without fetching dependencies or external groups. Installation verifies selected source files and entrypoints. Failed operations exit nonzero.

## Add options

| Option                        | Behavior                                                                       |
| ----------------------------- | ------------------------------------------------------------------------------ |
| `--pack <names...>`           | Full identities or unambiguous source-local slugs                              |
| `--content <groups...>`       | Select `docs`, `code`, or `examples`; defaults to all declared groups          |
| `--ref <ref>`                 | Git revision of the source containing definitions; defaults to `HEAD`          |
| `--package-version <version>` | Exact package version with an explicit upstream mapping                        |
| `--list`                      | List source packs without installing or writing config                         |
| `--output <directory>`        | Persist a relative per-pack destination override                               |
| `--install-dir <directory>`   | Persist a documentation destination override; preferred spelling of `--output` |
| `--code-dir <directory>`      | Persist a separate hidden repository-code destination                          |
| `--cwd <directory>`           | Use the specified consuming project                                            |

Pack identity selection and content-group selection are independent. A source with one root-level manifest selects that root automatically, preserving bundle compatibility even when nested components exist. Otherwise a source with exactly one entry selects it; multiple entries require explicit `--pack`. Duplicate identities and duplicate groups are rejected. Adding an already recorded pack or preset fails rather than updating it implicitly.

## Recommended standards sets

The root catalog provides recommended TypeScript, Rust, and Python composites:

```sh
CONSUMER="$(mktemp -d)"
pnpm cli add "$PWD" --pack recommended-typescript recommended-rust recommended-python --cwd "$CONSUMER"
pnpm cli list --cwd "$CONSUMER"
```

This records three presets and installs seven unique components. Presets fix member versions, content, and reading order; `--content` overrides are rejected. See [presets](presets.md) for deduplication, destination overrides, and restoration.

The global `--version` option reports the CLI version; package versions use `--package-version`.

Sources accept explicit local paths, `file:<path>`, `git+<repository>[#ref]`, Git URLs, or `owner/repo` GitHub shorthand. There is no hosted pack catalog or `nextjs@16` package-selector syntax yet. Plain repository content can be declared through dependency `selection` in [project configuration](project-config.md).

## Curated content

From this repository, the checked-in [React example](pack-definition.md) demonstrates separate docs and code sources:

```sh
pnpm cli add ./docs/examples/react --package-version 19.2.0 --content docs code
```

Git must be installed for repository sources. Existing Git credentials are used; Granary does not configure authentication. Submodules and Git LFS payload retrieval are outside this slice.

## Planned commands

`update` and `remove` are not implemented. See [project configuration](project-config.md) for recorded intent, destinations, and restoration behavior.
