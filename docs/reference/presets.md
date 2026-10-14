# Presets

Structured manifests express presets as named composite `packs` with ordered `includes`, described in the [manifest reference](pack-manifest.md). Granary's root manifest provides recommended TypeScript, Rust, and Python presets whose members reference independent directories under `packs/`. Each member directory owns its own `granary.json`, identity, version, and file selection. Consumer `dependencies` records only selected composites; the lock expands and verifies their leaf requests. The preset model below remains the internal representation and legacy format.

`granary.preset.json` describes an ordered, versioned set of leaf packs. The workspace CLI discovers it alongside bundle manifests and curated definitions. Presets are implemented locally and through Git; published npm packages remain placeholders.

```json
{
  "name": "example/recommended",
  "version": "0.1.0",
  "description": "Recommended engineering rules.",
  "packs": [
    {
      "name": "example/engineering",
      "source": { "kind": "local", "path": "../../engineering" },
      "manifest": "granary.json",
      "version": "0.1.0",
      "content": ["docs"]
    }
  ]
}
```

## Fields

| Field              | Contract                                                    |
| ------------------ | ----------------------------------------------------------- |
| `name`             | Full portable identity, distinct from its members           |
| `version`          | Semantic version of this preset definition                  |
| `description`      | Nonempty description                                        |
| `packs`            | Nonempty ordered array of unique leaf requests              |
| `packs[].name`     | Exact member identity                                       |
| `packs[].source`   | Local or Git source object                                  |
| `packs[].manifest` | Relative manifest path within that member source            |
| `packs[].version`  | Required exact package/content version; no range resolution |
| `packs[].content`  | Required unique selection of declared content groups        |
| `packs[].output`   | Optional relative member destination override               |

Unknown fields, duplicate member identities, self-reference, and nested preset requests are rejected. Presets do not contain payload files or install their README; component entrypoints and preset reading order appear in the generated index.

## Source interpretation

In a local preset, member local paths are relative to the directory containing the preset definition. In a Git preset, relative local paths refer to directories in the same repository at the preset's pinned commit. Repository escapes and absolute host-local paths are rejected for Git presets. Explicit Git member sources may use separate repositories and refs.

Exact member versions are resolved through the standalone pack or curated-definition contract. A pack's content version must match; curated package versions require explicit mappings. A version is never guessed to be a Git tag.

## Installation

From a Granary checkout, select the checked-in sets into a fresh consumer:

```sh
CONSUMER="$(mktemp -d)"
pnpm cli add "$PWD" --pack recommended-typescript recommended-rust recommended-python --cwd "$CONSUMER"
pnpm cli list --cwd "$CONSUMER"
pnpm cli install --cwd "$CONSUMER"
```

This installs seven unique components and records three presets. Shared components deduplicate when their complete requests are identical. Different source locators, versions, content selections, or destinations for the same identity fail explicitly.

`--content` cannot override preset membership. Select a leaf component to customize content. `--output` on the preset becomes the destination override for its members. `--package-version` on a preset requires that exact preset-definition version; member versions remain declared by the preset.

Adding an already selected preset fails. Adding a new preset may reuse identically recorded components without reinstalling their payloads. All new members are retrieved and preflighted before consumer writes.

## Consumer records and restoration

Config stores expanded leaf requests in `packs` and selected preset requests in optional `presets`. The lock stores optional preset records containing original intent, definition source/revision/hash, preset version, and ordered expanded members. Every member must match an installed leaf request.

`install` verifies preset intent and definition integrity, revalidates recorded membership against the pinned definition, and restores locked component bytes. Changed local preset definitions fail rather than silently change membership. Git definitions and same-repository members remain pinned after their branch moves.

The generated index lists each preset's reading order followed by canonical component entrypoints. In a polyglot workspace, language-specific rules apply only to their own language.

## Errors and limitations

- Invalid or recursive definitions fail validation with a nonzero CLI exit.
- Conflicting shared members fail before consumer files are written.
- Missing or drifted definitions, unavailable sources, and edited destinations preserve the existing installation by failing.
- Equivalent-but-different source spellings are not automatically treated as the same request.
- Presets are flat; dependency cycles and transitive preset expansion are unsupported.
- `update` and `remove` remain planned, including preset membership lifecycle behavior.
- `validate` checks structured catalogs and local leaf payloads as well as standalone pack fields. `add --list` validates provider metadata without installing.

See [project configuration](project-config.md), [sources](sources.md), and [standards packs](../concepts/standards-packs.md).
