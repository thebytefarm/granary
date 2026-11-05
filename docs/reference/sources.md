# Sources

Local directories and Git repositories supply reference material. Sources can own a `granary.json`, but participation is optional: consumers can select ordinary repository files themselves.

| Source               | CLI locator                         | Behavior                                              |
| -------------------- | ----------------------------------- | ----------------------------------------------------- |
| Local directory      | `file:./reference` or `./reference` | Read local selected files.                            |
| Named local member   | `file:./packs#engineering`          | Select an explicitly declared member.                 |
| GitHub repository    | `github:owner/repo[/pack]`          | Resolve a repository and optional declared member.    |
| Other Git repository | `git+<repository-url>[#pack]`       | Retrieve selected material at an exact locked commit. |

Revisions belong in manifest values as shorthand strings or explicit `branch`, `tag`, or `commit` selectors. An omitted selector uses the remote default branch. A locator's `#` suffix selects a pack, not a revision.

## Discovery

`granary init` offers bundled `recommended-typescript`, `recommended-rust`, and `recommended-python` sets. See [CLI initialization](cli.md#initialize-a-project) for detection and selection.

## Bundled sources

Use `builtin:bytefarm@0.1.0#recommended-typescript` to select the exact snapshot shipped with Granary. Installation and restoration read packaged assets without network retrieval. The manifest and lock retain portable `builtin:` identities, never checkout or npm installation paths.

Versions require three numeric components; ranges, `latest`, and Git revision selectors are invalid. Unavailable collections or versions fail instead of substituting another snapshot. Relative members stay inside the bundled source, and locked hashes verify definitions and selected bytes. Multiple language sets selected by `init` share `.granary/context/docs/bytefarm`, deduplicating common components.

```sh
granary add builtin:bytefarm@0.1.0#recommended-typescript
```

## Source discovery

`granary add <source> --list` reads only the root manifest and its declared nested membership. It never scans undisclosed directories. A manifestless source returns no named packs but remains installable. Invalid root metadata fails rather than falling back to a different format.

Granary's `packs/granary.json` declares the distributed language sets. Each component directory is also an independently installable source. The repository-root manifest describes only this repository's local adoption.

## Paths and transport

Relative local SDK sources resolve from the client project. Relative members resolve from their declaring manifest's directory. A local member inside a Git source stays inside that repository at its parent's pinned commit. Escaping paths and symlinks fail.

Git retrieval uses disposable shallow fetches of the requested ref or exact locked commit, without downloading repository history. On servers supporting partial fetches, Granary reads the file tree first and downloads blobs only for manifests and selected content. Servers without filtering support may send all blobs for that commit; they still do not send its history. The consumer receives selected bytes, not a retained repository checkout. Private repositories require existing Git credentials. Submodule and Git LFS payloads are not fetched separately.

## Integrity and errors

Definition bytes and selected content use SHA-256 hashes. Local sources must retain locked bytes for restoration. Git branches can move; restoration reads their previously locked commit while it remains available upstream.

Unavailable revisions, ambiguous shorthand refs, invalid metadata, and unsafe selected paths fail without consumer writes. Unselected repository symlinks are not materialized; selected symlinks and symlinked content roots are rejected. Restoration fetches the recorded commit directly and fails if it is unavailable, rather than substituting a newer branch or tag. Competing branch/tag selectors are invalid. See [project configuration](project-config.md) for ownership conflicts and reviewed updates.

Website ingestion, archives, object storage, URL/API providers, and a skills.sh adapter are not implemented.
