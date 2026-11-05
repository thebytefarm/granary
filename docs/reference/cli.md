# CLI

The `granary-ai` npm package installs `granary`. It supports local/Git sources, locked restoration, reviewed updates, and standards conversion. Requires Node.js 26+ and Git; macOS and Linux are supported.

```sh
npm install --global granary-ai
```

```sh
granary --help
granary --version
granary init
granary validate
granary add nextjs@16
granary install nextjs@16.0.0 --output reference/nextjs
granary install
granary list
```

| Command              | Behavior                                                                                    |
| -------------------- | ------------------------------------------------------------------------------------------- |
| `init`               | Scaffold project configuration with optional guided first-source installation               |
| `create <directory>` | Author a reusable pack definition around existing material, without installing it           |
| `validate`           | Validate current `granary.json` fields through maltty                                       |
| `add <source>`       | Adopt source material, write intent, and install transactionally; canonical spelling        |
| `install [source]`   | With a source, equivalent to `add`; without one, resolve initial intent or restore the lock |
| `list`               | Display locked identities and destinations                                                  |
| `standards`          | Convert classified standards or configure review defaults                                   |
| `update`             | Prepare review JSON, or apply explicit decisions with `--apply`                             |

## Initialize a project

```sh
granary init
granary init --yes --name my-app
granary init --yes --preset recommended-typescript recommended-rust
```

`init` sets up Granary at a consuming project's root; it does not author a reusable pack. The root is the current directory or explicit `--cwd`, not an automatically discovered Git root. In a monorepo, explicitly choose the repository or workspace that should own its context.

In an interactive terminal, `init` uses maltty's built-in text, selection, multiselection, and confirmation prompts. The project name is prefilled from that root's `package.json` and remains editable; Enter accepts it. Choose detected context packs, configuration only, or a custom source to install. Sources accept the same locators and Next.js shorthand as `add`. Confirm the configuration before any consumer files are written; declining or cancelling a prompt leaves the project unchanged.

| Option               | Behavior                                                                 |
| -------------------- | ------------------------------------------------------------------------ |
| `--yes`              | Skip prompts; write an empty scaffold unless `--preset` selects sets     |
| `--preset <sets...>` | Select tool documentation packs or recommended language standards sets   |
| `--name <name>`      | Initial project name; overrides package metadata and directory detection |
| `--cwd <directory>`  | Initialize an existing workspace directory                               |

Project names use lowercase letters and numbers separated by hyphens or slashes. Package names are normalized to this format: `@team/web.app` becomes `team/web-app`. Missing, unreadable, malformed, or unusable package metadata falls back to the normalized directory name, then `project`. This name labels the consumer configuration, not a published pack. Non-interactive invocations require `--yes` rather than waiting for input.

The scaffold contains `name` and an empty `packs` object. Scaffolding does not create a lock, installed content, or `AGENTS.md`. Existing `granary.json` or `granary-lock.json` entries, including symlinks, are rejected without changes. Configuration creation is exclusive and never overwrites a file created during setup.

Choosing a source uses the existing adoption pipeline and default destinations; successful installation also writes the lock and agent reference links. Source-resolution failures leave no configuration. If installation fails after scaffolding, `granary.json` remains available; correct the source and retry with `granary add <source>`. `init` is optional: `add` can still create configuration directly.

The context picker offers Next.js, React, TanStack Query, Router, Start, Hono, Zod, and Vercel AI SDK documentation, followed by optional Bytefarm TypeScript, Rust, and Python standards. Tool recommendations use the root `package.json` dependencies, devDependencies, peerDependencies, and optionalDependencies. Next.js config files (`next.config.js`, `.mjs`, `.ts`, or `.cjs`) also recommend Next.js. Only supported, explicitly declared tools are inferred; transitive dependencies are not scanned.

Root `tsconfig.json` or a `typescript`/`@typescript/native-preview` dependency recommends TypeScript standards; `Cargo.toml` recommends Rust; `pyproject.toml`, `requirements.txt`, or `setup.py` recommends Python. Nested directories are not scanned. Detected packs are preselected, not automatically installed: change or clear the selection before confirmation.

Tool packs embed the checked-in curated definitions and retain ordinary pinned upstream sources in consumer configuration; installation requires Git/network access. These are labeled documentation snapshots, not automatic matches to installed dependency versions. Language standards use exact [bundled sources](sources.md#bundled-sources), require no network retrieval, and share common components. With `--yes`, only explicit `--preset` selections install context; for example, `granary init --yes --preset hono zod`. Failed selected-pack installation retains intent in `granary.json`; retry with `granary install`.

## Author a reusable pack

```sh
granary create ./reference/team-rules
granary create ./reference/team-rules --yes --name team/rules --include 'README.md' 'docs/**'
```

`create` describes an explicit, existing directory of reference material. Unlike `init`, its name is a reusable pack identity, defaulting to the target directory name rather than npm metadata. The wizard asks for identity, optional description and version label, and include/exclude globs before confirmation. It writes only the target's `granary.json`: no consumer configuration changes, registration in a parent manifest, installation, lock, or agent links. See [create a context pack](../guides/create-pack.md).

| Option                   | Behavior                                                                             |
| ------------------------ | ------------------------------------------------------------------------------------ |
| `--yes`                  | Skip prompts and create the definition from flags/defaults                           |
| `--name <identity>`      | Pack identity; defaults to the target directory name                                 |
| `--description <text>`   | Explain when the material is useful                                                  |
| `--pack-version <label>` | Authored version label, initially `0.1.0`; `--version` still reports the CLI version |
| `--include <globs...>`   | Positive source-relative globs; defaults to `**/*.md`                                |
| `--exclude <globs...>`   | Positive source-relative exclusion globs; omitted by default                         |
| `--cwd <directory>`      | Base for resolving the required pack-directory argument                              |

The wizard accepts one include glob and one optional exclude glob. Supply `--include`/`--exclude` to use multiple globs instead, or edit the resulting manifest. Existing target manifests, locks, and symlink directories are rejected. No target directory, README, or content is generated. Validation checks the definition's syntax; review selected content and links before sharing. Creating a nested pack does not implicitly make it a selectable member of its parent.

## Add options

`install <source>` accepts the same options and uses the same adoption pipeline. Bare `install` rejects source-specific options; it never resolves framework shorthand or advances a locked revision.

| Option                 | Behavior                                                           |
| ---------------------- | ------------------------------------------------------------------ |
| `--branch <name>`      | Select an explicit Git branch                                      |
| `--tag <name>`         | Select an explicit Git tag                                         |
| `--commit <hash>`      | Select an exact Git commit                                         |
| `--output <directory>` | Persist a relative destination override                            |
| `--list`               | Discover declarations without installing or writing consumer files |
| `--cwd <directory>`    | Select the consuming workspace (available on every command)        |

Choose at most one revision flag. Omission uses the remote default branch. Revision flags are invalid for local material. Sources accept local paths, `file:<path>`, `github:<owner>/<repo>[/<pack-name>]`, `git+<repository>[#pack-name]`, or Git URLs. A pack name selects declared membership, not a filesystem directory.

These commands write source-keyed `packs` entries in `granary.json`. Add another explicit tag from the same source to append a version; existing locked payloads are not advanced or rewritten. Re-adding the same tag fails rather than replacing its selection. For include/exclude selection, other multiple installations, or nested composition, edit the manifest directly. Upstream repositories need no Granary manifest. See the [manifest contract](pack-manifest.md).

Root `output` is the destination base. Member overrides resolve beneath an explicit root base; without one they are workspace-relative. Omitted destinations use namespaced paths beneath `.granary/context`. Granary ignores generated `.granary/` contents automatically while keeping `granary.json` and `granary-lock.json` at the project root. Explicit output overrides are not automatically ignored. To change an existing selection, edit it and prepare an update instead of adding it again.

The CLI does not accept `--pack`, `--content`, `--ref`, `--package-version`, `--install-dir`, or `--code-dir`. Put selection and destinations in the manifest. `--version` reports the CLI version.

Git must be installed for both source retrieval and agent-context generation. The consumer directory does not need a Git repository. Existing credentials are used for repository sources; Granary does not configure authentication. Submodules and Git LFS retrieval are not implemented.

## Agent instruction index

`add`, `install`, and reviewed update application create or refresh a `<granary-context>` region in root `AGENTS.md`. It links directly to each installed pack group's entrypoint with its identity, version, and group, without embedding the reference material or generating a separate `INDEX.md`. Links resolve from the project root, including explicit destinations and separate code outputs. If all packs are removed through review, the region reports that no packs are installed. Update previews and `--list` do not write instructions.

The region is generated with the Almanac SDK and written through Granary's installation transaction. Bytes outside it, including other Almanac regions, are preserved. Duplicate or incomplete Granary markers, unsafe instruction paths, and edits made after installation preflight fail without overwriting them. Root `AGENTS.md` must be a regular file or absent; symlinks are rejected. A payload destination overlapping `AGENTS.md` fails preflight.

Granary does not create compatibility aliases, change separate agent instruction files, install hooks, stage Git changes, or read or write consumer Almanac configuration. Existing compatibility aliases to `AGENTS.md` continue to resolve to it. See [agent context](../guides/use-agent-context.md).

## Curated Next.js documentation

```sh
granary add nextjs@16
granary add nextjs@15.5.0
granary install
```

The built-in recipe supports stable Next.js 15 and 16 documentation from `vercel/next.js`. Numeric major, minor, and exact versions are supported: `nextjs@16`, `nextjs@16.0`, and `nextjs@16.0.0`. Major/minor selections choose the highest matching stable Git tag at adoption time. Prereleases, ranges, `latest`, and omitted versions are rejected. Use an explicit source and manifest selection for other releases or content.

The recipe selects `docs/**`, not implementation or examples. It does not install Next.js as a dependency, execute MDX, or guarantee every linked external asset is available offline. The CLI prints the resolved tag; the manifest stores that exact tag and selection, and the lock pins the resolved commit and file hashes. Recipe changes cannot silently change locked restoration. The shorthand is CLI convenience; the SDK continues accepting explicit structured sources and file selections.

Two versions use separate namespaced destinations by default. A second addition resolving to a tag already declared fails with instructions to restore or review changes. There is no persisted semver range or automatic upgrade: use `add` for another version or edit the exact tag and review an update. `add nextjs@16 --list` resolves and prints the recipe without installing or writing consumer files; it still requires Git/network access.

Arbitrary local/Git sources retain their ordinary defaults. They are not automatically restricted to documentation. A local directory literally named `nextjs` or `nextjs@16` can be addressed with an explicit path such as `./nextjs@16`.

## Standards extraction

```sh
granary standards --setup
granary standards
granary standards --source ./packs/team-standards --format markdown
```

| Option                 | Behavior                                                              |
| ---------------------- | --------------------------------------------------------------------- |
| `--source <directory>` | Inspect authored local material instead of installed locked documents |
| `--setup`              | Write review defaults to existing `granary.json`, preserving mappings |
| `--format <format>`    | `json` (default), `yaml`, `markdown`, or `greptile`                   |
| `--cwd <directory>`    | Select the workspace and its enforcement settings                     |

`--setup` cannot be combined with `--source` or a non-JSON format. JSON extraction writes directly to stdout with `schemaVersion: 1` and a `standards` array. Each standard retains its Markdown, rationale, examples, rules, and provenance. Authored enforcement and effective consumer enforcement remain separate. Unmapped rules use `[review]`.

YAML uses YAML 1.2's JSON-compatible flow syntax. Markdown retains complete authored concepts and appends effective controls and provenance. Greptile output follows its `.greptile/rules.md` convention. Conversions do not write files; redirect into a new file and review it before replacing reviewer instructions.

Only documents classified `standards` are extracted. An empty array is valid. Malformed standards, unsupported kinds, and mappings to unknown rules fail. See [standards documents](../concepts/standards-documents.md) and [enforcement configuration](project-config.md#standards-enforcement).

## Update preview

```sh
granary update > review.json
```

Edit `granary.json` before preparing a review to change revisions, file selection, membership, or destinations. Preparation reads the declared graph without applying changes. Ordinary locked installation rejects pending intent changes. Source arguments and selector flags are not accepted.

| Classification | Meaning                                             |
| -------------- | --------------------------------------------------- |
| `unchanged`    | Baseline, local, and incoming agree                 |
| `upstream`     | Only incoming differs from baseline                 |
| `local`        | Only local differs from baseline                    |
| `identical`    | Local and incoming reached the same changed content |
| `conflict`     | Local and incoming changed differently              |

Each file includes complete `baseline`, `local`, and `incoming` versions, one shared encoding (`utf8` or `base64`), and an explicit decision. Absent content is `null`. Additions and removals are explicit; renames appear as deletion/addition pairs. Retained baseline bytes are hash-verified. Unavailable exact bytes fail rather than producing a guessed comparison.

## Reviewed updates

```sh
granary update --apply review.json
```

Use a new review filename when preparing: shell redirection replaces an existing file. Review artifacts can contain private consumer edits. Treat them as workspace data, not public upstream material.

| Option              | Behavior                                          |
| ------------------- | ------------------------------------------------- |
| `--apply <file>`    | Apply decisions from an existing review JSON file |
| `--cwd <directory>` | Workspace; relative review paths resolve here     |

| Decision   | Selected result                                                            |
| ---------- | -------------------------------------------------------------------------- |
| `incoming` | Captured incoming content or absence                                       |
| `local`    | Captured local content or absence                                          |
| `merge`    | Reviewer-provided `merged` string in the recorded encoding; `null` deletes |
| `defer`    | Unresolved; blocks the entire application                                  |

Unchanged, upstream-only, and identical changes default to incoming. Local-only changes default to local. Conflicts default to defer. Edit only decisions and merged content; regenerate the review if captured inputs change.

Apply checks metadata, local files, incoming hashes, standards, and affected enforcement mappings. Unreviewed local additions or edits invalidate the artifact. Configuration, lock metadata, and installed content are written through the preflight/recovery transaction. Ordinary write failures restore attempted replacements and deletions. This is not crash-safe multi-file storage; concurrent installers are unsupported.

Apply uses captured incoming bytes, so an upstream ref moving after preparation cannot change the approved result. It returns the new lock as JSON. Empty directories and baseline caches may remain. See [pack maintenance](../concepts/pack-maintenance.md).

## Errors and limits

Invalid arguments, malformed configuration, unsafe paths, source failures, changed provenance, stale reviews, and unresolved decisions exit nonzero. Validation checks manifest fields; installation verifies selected material. Content is not executed.

Website ingestion, a standalone `remove` command, automatic conflict merging, and an interactive review UI are not implemented.

## Maintenance skills

The npm package includes skills for authoring, customization, update review, and upstream contribution. See [using the skills](../guides/use-granary-skills.md).
