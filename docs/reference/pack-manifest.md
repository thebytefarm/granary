# Pack manifest

An installable pack's `granary.json` describes files and included packs. Only `name` is required; the same contract configures consumer projects. This is the workspace implementation, not the published CLI contract.

```json
{
  "name": "engineering",
  "description": "Engineering rules and runnable examples.",
  "license": "MIT",
  "files": {
    "include": ["README.md", "rules/**", "examples/**"],
    "exclude": ["**/fixtures/**"]
  },
  "packs": { "github:acme/standards/testing": "testing/v1" }
}
```

## Selection and membership

File selection supports Markdown, MDX, source code, examples, and binary content. Without `files` or `packs`, regular files are selected. A pack with `packs` but no `files` selects only members. An explicit empty include array selects no own content.

Named entries under `packs` declare selectable children without repeating `name`. Source-keyed entries select another repository or declared pack. Installing the root includes all members recursively; selecting a child excludes its siblings. Directory discovery never creates membership. See [project fields](project-config.md#unified-fields) for revision selectors and destination rules.

Optional `version` labels authored material; it does not resolve Git releases. Select source revisions with tags, branches, or commits. Retain upstream license and attribution material required by its terms.

## Independent components

A component directory can own its manifest and files. A separate recommended set can compose those sources:

```json
{
  "name": "recommended-typescript",
  "packs": {
    "engineering": { "source": "file:./engineering", "output": "engineering" },
    "typescript": { "source": "file:./typescript", "output": "typescript" }
  }
}
```

Local source paths resolve from the declaring manifest's directory. Within a Git source, relative members stay in that repository at the parent's pinned commit. See [presets](presets.md) and [separate upstream sources](pack-definition.md).

## Document kinds

`"documents": { "immutability.md": "standards" }` classifies exact selected paths. Unlisted files are ordinary context. Unsupported kinds and declarations naming missing source files fail. Consumer filtering can omit declared documents from the installed selection.

Standards use the [standards document contract](../concepts/standards-documents.md). Installation and restoration copy classified bytes without requiring interpretation. When registered, the standards plugin checks complete markup and duplicate identities during conversion and reviewed updates; ordinary context is not implicitly interpreted as standards. The CLI registers that plugin for standards commands and reviewed updates.

Optional `plugins` maps namespace names to JSON configuration. Core validates this envelope without interpreting plugin settings or loading code. Each registered plugin owns its settings schema; standards enforcement lives under `plugins.standards`. See [plugin configuration](project-config.md#standards-enforcement).

## Validation and errors

`granary validate` checks manifest syntax and fields without downloading sources or installing content. Installation resolves selected sources and checks payload ownership. Help, version, and `about` do not require a manifest.

Unknown fields, absolute or escaping selection paths, negative include globs, conflicting revision selectors, invalid member references, cycles, and destination conflicts fail explicitly. No historical manifest filenames or alternate configuration formats are read.

The runtime contract lives in `packages/core/src/manifests/schema.ts`. [Project configuration](project-config.md) describes consumer intent, locking, and accepted customizations.
