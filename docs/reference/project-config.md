# Project configuration

`granary.json` describes authored packs and adopted source material. Only `name` is required. Put source-backed selections and named inline definitions under `packs`. This contract is implemented in the workspace CLI and SDK; it has not been published yet.

```json
{
  "name": "my-app",
  "output": "reference",
  "packs": {
    "github:vercel/next.js": [
      "v15.5.0",
      {
        "tag": "v16.0.0",
        "files": { "include": ["docs/**", "examples/**"], "exclude": ["**/fixtures/**"] },
        "output": "next-16"
      }
    ]
  }
}
```

The upstream repository does not need a manifest. Selected code, docs, examples, and binary files are copied as consumer-owned material, not executed or installed as dependencies.

## Unified fields

| Field                               | Contract                                                                             |
| ----------------------------------- | ------------------------------------------------------------------------------------ |
| `name`                              | Required project/default pack name.                                                  |
| `description`, `version`, `license` | Optional authored metadata. `version` does not resolve Git releases.                 |
| `files.include`                     | Positive source-relative globs. An empty array selects no own files.                 |
| `files.exclude`                     | Optional positive globs removed from the include selection.                          |
| `documents`                         | Exact selected paths mapped to `context` or `standards`.                             |
| `packs`                             | Named inline definitions or source-keyed installations, including recursive members. |
| `source`                            | Optional source for a named definition; omit it when the key is a locator.           |
| `output`                            | Consumer destination base. Defaults to `.granary/context`.                           |
| `standards`                         | Optional consumer enforcement settings.                                              |

Source entry values accept a revision string, a configured object, or a nonempty mixed array. Configured Git objects accept at most one of `branch`, `tag`, or `commit`. Omission resolves the remote default branch. Strings are exact Git revisions, not semver ranges. Ambiguous branch/tag names require an explicit object.

GitHub keys use `github:<owner>/<repo>[/<pack-name>]`. Local sources use `./directory`, `../directory`, or `file:<directory>[#pack-name]`. Other Git hosts use `git+<repository-url>[#pack-name]`, with the revision in the value. A `#` suffix selects a pack, not a revision.

Installing a pack includes its declared members recursively. Selecting a named child excludes siblings. Physical nested manifests are not automatic members. A pack with `packs` and no `files` is composition-only; add `files` to include its own payload. A source with neither defaults to regular files, excluding Git metadata and effective consumer destinations. Local material can include untracked files; narrow the selection before sharing it.

`source: "#engineering"` selects a named sibling in the same source snapshot. Same-repository relative sources stay pinned to their parent's Git commit. Granary's root manifest consumes only TypeScript; `packs/granary.json` declares the distributed language sets.

## Unified destinations

Root `output` is the member destination base. The explicit Next.js destination above is `reference/next-16/`. Without a root override, explicit member output is project-relative.

Keep `granary.json` and `granary-lock.json` at the project root; `output` changes installed content paths, not configuration or lockfile locations.

Without a member override, destinations are namespaced by source/pack locator and requested revision beneath the output root. For example, Next.js tags `v15.4.0` and `v15.5.0` coexist at `.granary/context/github/vercel/next.js/v15.4.0/` and `.granary/context/github/vercel/next.js/v15.5.0/` without output overrides.

Granary generates `.granary/.gitignore` containing `*`, keeping installed context and the shared `.granary/cache/baselines/` cache out of Git. The root `.gitignore` is not modified. A differing existing `.granary/.gitignore` fails preflight rather than being overwritten. Explicit output overrides remain supported, including `.context/` or tracked project directories; Granary does not automatically ignore those destinations.

Generated segments preserve ordinary letters, digits, dots, underscores, and hyphens. Unsafe characters use `_x<UTF-8 hex>_` escapes; literal `_x` sequences are escaped too to prevent collisions. Empty segments and leading dots or hyphens are escaped. Slash-containing refs occupy one segment, so `feature/docs` becomes `feature_x2f_docs`. Advancing a branch does not change its destination. Parent destinations become bases for children; child overrides stay beneath them.

Identical selections at the same destination deduplicate. Adding a set preserves existing shared payloads, including consumer edits. Changed shared upstream content requires a reviewed update. Different installations cannot claim the same directory; arrays do not provide overwrite precedence.

## Locked restoration

`granary-lock.json` records the manifest, pinned composition definitions and ordered edges, exact Git commits, expanded selections, resolved destinations, and SHA-256 file hashes. Installation restores locked content without advancing moving refs. It verifies definitions and composition membership before writes.

Missing managed files are restored. Changed intent, local upstream bytes, edited managed files, and unmanaged destination collisions fail without overwriting consumer content. Local sources must retain their locked bytes; hashes cannot retrieve historical local files. Git commits must remain available upstream.

Change selections in `granary.json`, then review and apply them:

```sh
granary update > review.json
granary update --apply review.json
```

Preparation writes review JSON only. Resolve decisions before applying. Raw config and lock edits invalidate outstanding reviews. An empty consumer may retain `"packs": {}`.

## Standards enforcement

Optional `plugins.standards` settings affect interpretation, not upstream text or requirement levels. Core preserves JSON configuration under plugin namespaces; the registered plugin validates its own settings. Top-level `standards` is not accepted.

```json
{
  "name": "app",
  "packs": { "file:../team-standards": { "output": "reference" } },
  "plugins": { "standards": { "default": "[review]", "rules": {} } }
}
```

| Field                                  | Default              | Contract                                                       |
| -------------------------------------- | -------------------- | -------------------------------------------------------------- |
| `plugins.standards.default`            | `[review]`           | Only the review fallback is accepted.                          |
| `plugins.standards.rules`              | `{}`                 | Mappings keyed by the extracted `pack#standard/rule` identity. |
| `plugins.standards.rules.<id>.markers` | Required per mapping | Nonempty `[review]` or `[lint: check-id]` markers.             |
| `plugins.standards.rules.<id>.notes`   | Omitted              | Nonempty explanation of actual coverage.                       |

Use the identities returned by `granary standards`; expanded payload identities are not necessarily authored names. `granary standards --setup` atomically records defaults without erasing existing settings. Unknown mapped IDs fail extraction. A lint marker describes a real blocking check; Granary does not run, configure, or infer that check.

## Accepted customizations

Reviewed updates may record accepted local additions, edits, or deletions separately from upstream hashes:

| Field     | Contract                                                |
| --------- | ------------------------------------------------------- |
| `group`   | Owning locked content group.                            |
| `path`    | Unique exact group-relative path.                       |
| `content` | Canonical base64 local bytes, or `null` for deletion.   |
| `hash`    | SHA-256 of local bytes, or `null` with deleted content. |
| `kind`    | Optional effective document kind.                       |

The lock contains these bytes. Inspect them for secrets before sharing or committing. Restoration verifies upstream sources and accepted customization hashes; later unaccepted edits are not overwritten. Move retained material into a separate local pack before removing its entire upstream pack.

## Errors and limitations

Unknown fields, unsafe paths, symlinks, competing revision selectors, missing selected files, composition cycles, and excessive nesting fail validation or source resolution. Conflicts and drift fail before writes; transactions recheck observed destination bytes and roll back earlier writes on later failure.

Only `granary.json` supplies consumer configuration. Website ingestion, submodule retrieval, and Git LFS payload retrieval are not implemented. See [CLI commands](cli.md) for observable failure behavior and [sources](sources.md) for transport details.

Windows is not supported yet. Generated names use POSIX portable filename characters, but Windows reserved names and case-insensitive collisions are not normalized.
