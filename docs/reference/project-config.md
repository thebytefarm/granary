# Project configuration

`granary.json` records the context a project consumes under `dependencies`. The same document can declare provided `packs`; producer dependencies do not become transitive consumer dependencies.

```json
{
  "schemaVersion": 1,
  "dependencies": {
    "bytefarm/recommended-typescript": {
      "source": "file:.",
      "version": "0.1.0"
    }
  },
  "installDir": ".context",
  "codeDir": ".context/repos"
}
```

| Field                            | Default               | Meaning                                                                      |
| -------------------------------- | --------------------- | ---------------------------------------------------------------------------- |
| `schemaVersion`                  | Required: `1`         | Structured manifest contract                                                 |
| `dependencies`                   | Omitted               | Named selected leaf or composite packs                                       |
| `dependencies.<name>.source`     | Required              | `file:<path>` or `git+<repository>[#ref]`                                    |
| `dependencies.<name>.version`    | Omitted               | Exact semantic content version; Git ref remains separate                     |
| `dependencies.<name>.content`    | Available leaf groups | Select `docs`, `code`, and/or `examples`; composites fix their own selection |
| `installDir`                     | `.context`            | Project-relative documentation/examples destination                          |
| `codeDir`                        | `.context/repos`      | Separate reference-code destination beneath a hidden project directory       |
| `dependencies.<name>.installDir` | Project `installDir`  | Per-dependency documentation destination                                     |
| `dependencies.<name>.codeDir`    | Project `codeDir`     | Per-dependency hidden reference-code destination                             |
| `dependencies.<name>.selection`  | Omitted               | Explicit content for a source without a Granary manifest                     |

`installDir` can be `docs/`, `reference/`, or another project directory. Documentation stays managed and versioned at `<installDir>/docs/<identity>/<version>/`; examples use the `examples` category. Code uses `<codeDir>/<identity>/<version>/` and a generated `.gitignore` containing `*`. Changing the docs destination does not move code into the visible tree.

### Repositories without manifests

Use a consumer-owned identity and explicit `selection` to retrieve ordinary repository material:

```json
{
  "schemaVersion": 1,
  "installDir": "docs/vendor",
  "dependencies": {
    "example/library": {
      "source": "file:../library",
      "selection": {
        "docs": { "path": "docs", "entry": "README.md", "files": ["**/*.md"] },
        "code": { "path": "src", "entry": "index.ts", "files": ["**/*.ts"] }
      }
    }
  }
}
```

Selection paths resolve from the source root. Git selections are pinned to an exact commit; unversioned local selections use `0.0.0` as their destination version and file hashes detect drift. Each selected group must include its entrypoint. `install` creates the first lock for declared dependencies; subsequent invocations restore only matching locked intent and bytes.

### Integrity and ownership

The lock records definition hash strategy, source commits, ordered composite members, effective destinations, and selected file hashes. Structured declarations use canonical, selected-definition hashes: edits to unrelated packs, producer dependencies, or producer destinations do not invalidate them. Selected declarations, member order, or payload changes do.

Missing managed files can be restored. Edited or unmanaged destination files fail preflight. Installation roots are excluded from self-source selection; an authored payload beneath its destination is rejected. Absolute paths, parent traversal, and symlinks are rejected.

## Legacy configuration

`granary.config.json` remains readable. Its typed source objects, expanded `packs`, optional `presets`, and `output` fields retain their contract. Legacy locks without split code destinations retain their original layout. A structured `granary.json` and a `granary.config.json` cannot both supply consumer intent.

```json
{
  "output": ".context",
  "packs": [
    {
      "name": "example/legacy-bundle",
      "source": { "kind": "local", "path": "../legacy-bundle" },
      "manifest": "granary.json",
      "content": ["docs"]
    }
  ]
}
```

| Field                | Default        | Meaning                                                      |
| -------------------- | -------------- | ------------------------------------------------------------ |
| `output`             | `.context`     | Relative project-owned installation root                     |
| `packs`              | Required       | Selected packs; full identities must be unique               |
| `packs[].name`       | Required       | Full manifest identity                                       |
| `packs[].source`     | Required       | Local directory or Git source object                         |
| `packs[].manifest`   | Required       | Manifest path relative to the source root                    |
| `packs[].content`    | Required       | Unique selection of `docs`, `code`, or `examples`            |
| `packs[].version`    | Optional       | Exact package version from the curated definition's mapping  |
| `packs[].output`     | Project output | Per-pack destination override                                |
| `presets`            | Omitted        | Selected flat presets; expanded components remain in `packs` |
| `presets[].name`     | Required       | Exact preset identity                                        |
| `presets[].source`   | Required       | Local or Git preset-definition source                        |
| `presets[].manifest` | Required       | Relative preset path within its source                       |
| `presets[].version`  | Optional       | Exact requested preset-definition version                    |
| `presets[].output`   | Project output | Destination override applied to members                      |

Git sources use `kind: "git"`, `repository`, and `ref` (default `HEAD`). Local paths remain relative to the consumer project when entered that way. Upstream group paths are interpreted relative to their definition.

## Destinations

`add --output` persists the explicit override on new entries. Otherwise project `output` applies, defaulting to `.context`. Absolute destinations and parent traversal are rejected.

Content uses `<output>/docs/<identity>/<version>/`, `<output>/repos/<identity>/<version>/`, or `<output>/examples/<identity>/<version>/`. The version is the selected package version, definition-source commit for a Git request without a package version, or bundle/definition version for a local request.

## Locked restoration

`granary-lock.json` has `schemaVersion: 1` and a `packs` array. Each record contains:

- The original `request` and effective `output`.
- Definition source, exact Git revision when applicable, definition hash, and definition version.
- The selected content version and groups.
- Each group's source, commit, root, entrypoint, and selected file paths with SHA-256 hashes.

Optional `presets` records preserve definition intent, pinned source/hash, preset version, and ordered expanded member requests. Each member must match a locked leaf. Existing config/lock files without presets remain accepted. See the [preset contract](presets.md).

`install` compares config and lock semantically. Changed intent, local bytes, or managed destination files fail explicitly. Missing managed files are restored. Local hashes detect drift; they cannot retrieve historical bytes from a changed local directory.

The installer accepts JSON consumer configuration. Competing `granary.config.*` files are rejected before loading or rewriting consumer intent. `validate` checks structured catalogs and local provided entrypoints without fetching dependencies; standalone pack validation checks syntax and fields.
