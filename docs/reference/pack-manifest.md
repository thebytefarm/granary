# Pack manifest

An installable pack's `granary.json` describes the pack itself. Its identity and version are top-level fields; file paths are relative to the manifest's directory.

```json
{
  "name": "bytefarm/agent-instructions",
  "version": "0.1.0",
  "description": "Agent operating contracts and context routing.",
  "entry": "README.md",
  "files": ["*.md"]
}
```

| Field         | Required | Contract                                                                      |
| ------------- | -------- | ----------------------------------------------------------------------------- |
| `name`        | Yes      | Lowercase kebab-case name, optionally prefixed by a namespace and `/`         |
| `version`     | Yes      | Semantic content version; prerelease and build identifiers are supported      |
| `description` | Yes      | Nonempty description after trimming whitespace                                |
| `entry`       | Yes      | Relative entry-file path using forward slashes; no globs or parent traversal  |
| `files`       | Yes      | Nonempty list of positive, relative file paths or globs using forward slashes |

Unknown fields, absolute paths, parent traversal, and negated include patterns are rejected. These packs install their selected files as one `docs` group. Use [curated definitions](pack-definition.md) for separately selectable docs, code, and examples groups.

## Consumer manifests

A project can use Granary without providing an installable pack. Its manifest records only the dependencies it wants:

```json
{
  "schemaVersion": 1,
  "dependencies": {
    "bytefarm/recommended-typescript": {
      "source": "file:../granary",
      "version": "0.1.0"
    }
  }
}
```

No `packs`, entrypoint, or file selection is required for a consumer-only project. See [project configuration](project-config.md).

## Catalogs and presets

A separate structured catalog can declare several leaves or presets. This is a collection of declarations, rather than the shape required for every pack:

```json
{
  "schemaVersion": 1,
  "packs": {
    "example/rules": {
      "version": "0.1.0",
      "description": "Engineering reference material.",
      "path": "reference/rules",
      "entry": "README.md",
      "files": ["*.md"]
    },
    "example/recommended": {
      "version": "0.1.0",
      "description": "Ordered engineering context.",
      "includes": ["example/rules@0.1.0"]
    }
  }
}
```

Map keys supply full identities. Leaves declare `version`, `description`, `path`, `entry`, and `files`; composites declare `version`, `description`, and ordered `includes`. A local include must name an existing leaf at its exact version. Empty or duplicate members and nested composites are rejected.

Advanced leaves can replace `path`/`entry`/`files` with the existing curated `groups` and optional `versions` contract from [pack definitions](pack-definition.md). External include objects declare `name`, explicit locator `source`, exact `version`, optional `manifest` (default `granary.json`), and optional `content`.

Paths resolve from the manifest's directory. Provider discovery reads only explicitly declared packs from a structured root catalog. Producer `dependencies`, `installDir`, and `codeDir` never control a consumer's installation. See [project configuration](project-config.md) for consumption and destinations.

## Independent packs and presets

Give each independently distributed pack directory its own top-level `name`, `version`, `description`, `entry`, and `files` manifest. Its metadata and payload travel together; no `packs` wrapper or `path: "."` is needed.

A separate preset can reference that pack without repeating its file selection:

```json
{
  "schemaVersion": 1,
  "packs": {
    "example/recommended": {
      "version": "0.1.0",
      "description": "Recommended engineering context.",
      "includes": [
        { "name": "example/rules", "source": "file:reference/rules", "version": "0.1.0" }
      ]
    }
  }
}
```

The member's source contains its own `granary.json`. The preset owns membership and reading order; each member owns its payload and version. Local source paths are preset-directory-relative. When the preset is retrieved through Git, same-repository members are read at the preset's pinned commit. See [presets](presets.md).

`packs` and `dependencies` are independently optional, but the document must contain at least one declaration or dependency. Unknown fields and competing leaf/composite shapes are rejected.

## Discovery

The CLI uses the installed maltty config middleware. Its built-in resolver tries `granary.config.*` first, then the short-form data file `granary.*`. JSON is the preferred portable format; other supported formats inherit maltty's loader behavior.

Config loads lazily on the validation command. Help, version, and `about` do not require a pack manifest. Pack metadata uses single-config resolution; global/local layered merging is not enabled.

From the repository root:

```sh
pnpm cli validate
```

For structured catalogs this checks schema, local composite references, local file selection, and entrypoint inclusion without fetching external sources or installing content. Standalone pack validation checks syntax and fields; installation verifies selected files and entrypoint inclusion.

## Source of truth

The runtime schema and inferred `PackManifest` type live in `packages/core/src/packs/manifest.ts`. The CLI consumes them through `@granary/core`. maltty owns CLI configuration loading; Granary owns pack fields and portable source-metadata reading.

The hosting location is not a pack manifest field. Local and Git providers deliver the same manifest and selected content. [Project configuration](project-config.md) owns consumer intent; [curated definitions](pack-definition.md) describe selectable upstream groups.
