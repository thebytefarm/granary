# Manifest and pack installation proposal

**Status: draft for review.** This describes a proposed API, not the currently implemented schema. Approval covers the design; it does not authorize publishing or dependency changes.

Granary distributes source material that consumers own. A pack can contain docs, code, examples, standards, and other packs. One `granary.json` describes a project that provides material, consumes material, or does both.

## The common case

Put the source and optional pack name in the key. Put the requested Git revision in the value.

```json
{
  "name": "holly",
  "packs": {
    "github:thebytefarm/granary/engineering": "v1",
    "github:thebytefarm/granary/testing": "testing/v2",
    "github:vercel/next.js": ["v15.5.0", "v16.0.0"]
  }
}
```

No mandatory aliases, repeated source fields, empty objects, or output paths. Repositories without Granary manifests remain usable sources.

All repository names and revisions in examples illustrate the proposed syntax; they do not assert that those packs or tags currently exist.

## One manifest

Only `name` is required. Proposed optional root fields are `description`, `version`, `license`, `files`, and `packs`.

| Field         | Meaning                                                                                                   |
| ------------- | --------------------------------------------------------------------------------------------------------- |
| `name`        | Project or default pack name.                                                                             |
| `description` | Short explanation of the material.                                                                        |
| `version`     | Optional authored release label, not a Git revision resolver.                                             |
| `license`     | SPDX expression, `UNLICENSED`, or a license-file declaration such as `SEE LICENSE IN LICENSE`.            |
| `files`       | Selection of the project's own content.                                                                   |
| `packs`       | Named local pack definitions and source-backed selections. Composition behavior needs the decision below. |

License metadata does not replace license text, attribution, or upstream redistribution obligations. There is no generic `metadata` bucket or speculative `tags` field.

## File selection

Group selection under `files`. Globs apply to any file type.

```json
{
  "name": "engineering",
  "files": {
    "include": ["README.md", "standards/**", "examples/**"],
    "exclude": ["examples/**/fixtures/**"]
  }
}
```

Selection paths are relative to their owning source. Exclusions win. Missing `exclude` means no additional exclusions. An explicitly empty `include` selects no own files, allowing a composition-only pack.

Selecting files copies bytes; it does not execute source code or install the source repository's dependencies.

## Source and pack identity

Proposed GitHub grammar:

```text
github:<owner>/<repo>[/<pack-name>]
```

The first two segments identify the repository. An optional pack name selects a declared pack, not an arbitrary filesystem directory. A missing named pack is an error.

Local definitions use ordinary names:

```json
{
  "name": "team-standards",
  "packs": {
    "engineering": {
      "files": {
        "include": ["engineering/**"]
      }
    },
    "testing": {
      "files": {
        "include": ["testing/**"]
      }
    }
  }
}
```

An installation of `github:acme/team-standards/engineering` selects only `engineering` and its declared members. It does not include `testing` or other parent-level selections.

The same grammar needs explicit equivalents for local directories and other Git hosts. Local source keys should require a recognizable prefix such as `./` or `../`, rather than competing with ordinary pack names. Those exact locator forms are not finalized here.

## Strings, objects, and arrays

| Value                        | Meaning                                                                            |
| ---------------------------- | ---------------------------------------------------------------------------------- |
| String                       | One installation at a requested Git revision.                                      |
| Object                       | One installation with explicit revision type, selection, or destination overrides. |
| Array of strings and objects | Multiple installations of the same source and selected pack.                       |

```json
{
  "name": "holly",
  "packs": {
    "github:vercel/next.js": [
      "v15.5.0",
      {
        "tag": "v16.0.0",
        "files": {
          "include": ["docs/**", "examples/**"],
          "exclude": ["**/fixtures/**"]
        },
        "output": "apps/web/.context/next"
      }
    ],
    "github:thebytefarm/granary/engineering": {
      "branch": "main",
      "output": "contributing/engineering"
    }
  }
}
```

Expanded Git objects accept at most one of `branch`, `tag`, or `commit`. With none, resolve the remote's default branch. Local-directory selections do not accept Git revision selectors.

The pack is already in the key. Do not repeat it in a `pack` field. Avoid competing `ref` and `version` fields on installation objects.

When narrowing a declared pack with consumer `files`, filter its declared own-file selection. Do not expand beyond the author's selection or silently filter its child packs.

## Versioning: use Git releases

Follow the GitHub Actions model: a requested revision can identify a branch, tag, or exact commit.

| Author intent            | Example request      |
| ------------------------ | -------------------- |
| Repository-wide release  | `v1.2.0`             |
| Independent pack release | `engineering/v1.2.0` |
| Maintained major channel | `engineering/v1`     |
| Development line         | `main`               |
| Immutable source         | Full commit SHA.     |

Independent pack tags still point at whole repository commits. Granary selects the named pack from that snapshot. There is no registry or history scan to locate a matching manifest `version`.

Strings resolve exact Git names, not semver ranges. Do not silently add a `v` prefix. If a branch and tag have the same name, require an explicit selector object rather than guessing.

The manifest records the requested revision. The lock records the resolved commit, selected pack, file selection, integrity, composition edges, and destinations.

- **Install** restores the locked selection without advancing refs.
- **Update** resolves the requested refs again and prepares an explicit review.
- Moving from `v1` to `v2` changes the request. Granary does not infer that upgrade.
- Accepted local customizations remain separate from upstream content hashes.

## Packs inside packs

Explicitly included packs should install with their parent. Discovering a nested manifest on disk should not create membership.

For example, a standalone composition pack could declare:

```json
{
  "name": "recommended-typescript",
  "files": {
    "include": []
  },
  "packs": {
    "github:thebytefarm/granary/engineering": "v1",
    "github:thebytefarm/granary/documentation": "v1",
    "github:thebytefarm/granary/typescript-functional": "v1"
  }
}
```

Installing it installs those three members, including their own explicitly declared members. Nested composition extends the current flat-preset implementation.

### The membership decision

The remaining tension is whether a root `packs` map is both a catalog and a composition. The examples above deliberately expose that choice rather than hiding a second meaning in the resolver.

:::question
Should installing a repository's default pack include every entry declared in its root `packs` map?

The simplest consistent rule is that a pack contains its own files and its declared child packs. Named children remain individually selectable. That makes the root both a catalog and an aggregate; it means installing a catalog root installs all its entries.

- [ ] Yes: `packs` always declares members; the default/root pack includes all of them.
- [ ] No: separate available pack definitions from an explicit membership list.

Recommended: Yes: `packs` always declares members; the default/root pack includes all of them.
:::

Under the recommended rule, selecting a named child never pulls in its siblings. A catalog maintainer who wants a narrower recommended set defines that set as its own named pack.

Graph resolution rejects cycles and reports the reference chain. Identical selections may share fetches, but different revisions remain distinct. Array position and discovery order do not define identity or overwrite precedence.

Sibling pack composition also needs a same-snapshot reference form. Prefer a local named-pack reference over repeating a remote URL and resolving a moving branch again. Its exact syntax remains open; do not treat a filesystem directory and a named sibling as interchangeable.

## Default content

For a source with a Granary manifest, selecting its default or named pack uses that pack's explicit contract. For a repository without a manifest, select source files directly. Explicit consumer `files` narrows either selection.

This supersedes the earlier suggestion that discovering a manifest should never affect default selection. The manifest defines the source's authored default; the lock makes changes to that definition reviewable.

:::question
What should an arbitrary Git repository include when the consumer supplies no `files` selection?

Requiring a manifest defeats arbitrary-repository installation. Guessing docs directories is unreliable. A complete tracked-file snapshot is predictable but can be large.

- [ ] All tracked files, with a size warning before the first unlocked installation.
- [ ] Require an explicit file selection for repositories without a manifest.

Recommended: All tracked files, with a size warning before the first unlocked installation.
:::

Git metadata is never payload. Submodules, Git LFS content, symlinks, and untracked local files need explicit source-adapter rules before implementation. A local directory does not automatically have Git's tracked-file boundary.

## Destinations and ownership

Omitted `output` installs beneath `.context/`. The generated layout needs a collision-safe source identity, selected pack, and requested revision. Do not use only `<repo>/<ref>`: owners, pack names, and slash-containing refs can collide.

Exact default path encoding remains open. It should remain stable while a tracked branch advances, rather than moving accepted edits into a new commit-named directory on every update.

An explicit `output` adopts material into a consumer-chosen directory, including `docs/`, `contributing/`, and source directories. Installed files belong to the consumer in both modes. `.context/` is a default location, not a prohibition on local edits.

Before writing, reject overlapping file destinations across installations. Never silently use array order or composition depth to choose a winner. Existing unrelated consumer files remain untouched.

:::question
Should a parent's explicit `output` relocate its included child packs?

A composition has multiple independently tracked members. Flattening them into one directory causes collisions; ignoring the parent's destination makes adopting a whole set awkward.

- [ ] Yes: treat it as a destination root and namespace child packs beneath it.
- [ ] No: `output` affects only the selected pack's own files; configure child destinations separately.

Recommended: Yes: treat it as a destination root and namespace child packs beneath it.
:::

The exact namespace and precedence between parent and authored child outputs need to be settled before schema implementation. Upstream destinations must not be able to escape the consumer-selected root.

## Scope after design review

Implementation requires coordinated schema, discovery, resolver, lock, installation, update-review, CLI, documentation, and test changes. Existing provenance and consumer customization protections remain intact.

This proposal does not add executable transforms, automatic code execution, semver range resolution, a registry, or an agentic linter. Inline standards enforcement formatting remains a separate agreed documentation change.

Review approval settles the selected design decisions. It does not make these examples valid in the current CLI.

## References

- [GitHub Actions workflow syntax](https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions): repository/path plus a Git revision.
- [Skills CLI](https://github.com/vercel-labs/skills#readme): repository-backed discovery, named skill selection, and direct tree sources.
- [Current context-pack concept](context-packs.md): existing product model, with implementation status distinct from this proposal.
- [Pack maintenance](pack-maintenance.md): reviewed updates and consumer-owned customizations.
