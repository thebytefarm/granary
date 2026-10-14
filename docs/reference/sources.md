# Sources

Local directories and Git repositories supply definitions and material. A curated definition can use a different source for each content group.

| Source            | CLI locator                  | Behavior                                                |
| ----------------- | ---------------------------- | ------------------------------------------------------- |
| Local directory   | `file:.`                     | Find declared packs and read selected files             |
| Local collection  | `./context-packs`            | Find several manifest roots recursively                 |
| GitHub repository | `owner/context-packs`        | Clone, find the requested commit, and inspect manifests |
| Git repository    | HTTPS, SSH, or `file://` URL | Retrieve files at a pinned commit                       |

Use `./` for local paths that look like `owner/repo`. Repository shorthand is a GitHub source, not a curated package name.

## Definition discovery

When a source root has a structured catalog, discovery lists only its declared packs and presets. A standalone pack directory describes itself through top-level `name`, `version`, `description`, `entry`, and `files` fields in `granary.json`; Granary selects it automatically when no `--pack` is supplied.

Without a structured root manifest, discovery searches for `granary.json`, `granary.pack.json`, and `granary.preset.json` definitions recursively. Granary's `packs/` collection exposes seven independent directories this way, while the repository-root manifest exposes three recommended presets. `.git`, `node_modules`, and `.context` subtrees are excluded. Manifests must be valid and identities unique within the source. An exact identity takes precedence over slug matching.

## Content sources

Local source objects use `kind: "local"` and `path`. Git objects use `kind: "git"`, `repository`, and `ref` (default `HEAD`).

Local group sources in a local definition are relative to its directory. Within a Git-backed definition, local groups must use `path: "."`; `root` selects a subtree relative to the definition directory at the pinned definition commit. Separate Git group sources use their own repository roots and version mappings.

Git retrieval uses disposable checkouts and records exact commits. No checkout is retained under the consumer's context directory: `repos/` contains selected source files. Git requires existing credentials for private repositories. Submodules and Git LFS payloads are not fetched separately.

## Integrity

Both providers record SHA-256 hashes of selected files and definition bytes. Local sources must retain those bytes for restoration. Git branches may move; `install` reads the previously locked commit while it remains available upstream.

Object storage, published archives, URL/API providers, and a skills.sh adapter remain planned. Their transport and authentication contracts are not finalized.
