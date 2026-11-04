# Create a context pack

Author a reusable pack around existing reference material, then validate and adopt it. Use `granary init` instead to set up a consuming project at its root.

## Prerequisites

- An installed Granary CLI or a built local Granary workspace
- Node.js 26+ on macOS or Linux; run the commands from your project root
- A directory containing useful Markdown reference material
- A root `README.md` that introduces and indexes the material

## 1. Choose the pack root

Keep the files required to read the pack under one directory:

```text
context/framework/
  granary.json
  README.md
  docs/
    api.md
```

One source repository can contain several directories shaped this way.

## 2. Write the entry file

In `README.md`, describe when the material is useful and link to its topics using relative paths:

```md
# Framework reference

Reference material for the framework's client API.

- [API](docs/api.md)
```

The entry file is a reading map. Keep detailed reference material in its owning files.

## 3. Create the pack definition

From your project root, run:

```sh
granary create context/framework
```

The maltty-guided workflow asks for the pack identity, description, version label, and file selection. The identity is prefilled from the target directory and can be edited. It is independent of the consuming project's name or npm package metadata. Confirm to create `context/framework/granary.json`; existing manifests are never overwritten.

For a scripted definition with several include globs:

```sh
granary create context/framework --yes --name example/framework-reference --description 'Client API documentation and usage guidance.' --include 'README.md' 'docs/**' 'examples/**' --exclude '**/fixtures/**'
```

This writes:

```json
{
  "name": "example/framework-reference",
  "version": "0.1.0",
  "description": "Client API documentation and usage guidance.",
  "files": {
    "include": ["README.md", "docs/**", "examples/**"],
    "exclude": ["**/fixtures/**"]
  }
}
```

The directory owns its identity and can be distributed independently. `version` and `description` are optional; the wizard allows them to be cleared. Grouped `files` selects any file type, including source and examples. The authoring command defaults to `**/*.md`; explicit globs keep incidental material out. Granary chooses `README.md` when selected, otherwise the first selected file, as the navigation entrypoint. Edit child `packs` to compose other selections. See [project configuration](../reference/project-config.md#unified-fields).

Pack creation writes only that definition. It does not generate content, install anything, change the consuming project's root configuration, or register nested membership automatically. Both workflows use `granary.json`, but project setup and reusable pack authoring are separate tasks.

## 4. Validate it

From the Granary workspace root:

```sh
granary validate --cwd context/framework
```

Use an absolute `--cwd` path if the pack is outside the workspace.

## Verification

Expect `Pack manifest is valid.` Standalone validation checks syntax and fields; installation checks local file selection and entrypoint inclusion. Check that the entry's links resolve and the selection contains the intended material. Presets can reference this directory's manifest without redeclaring its payload; see [presets](../reference/presets.md).

The [manifest reference](../reference/pack-manifest.md) defines every field. The [installation guide](install-packs.md) describes the consumer workflow.

## Troubleshooting

If the target already contains `granary.json` or a lock, inspect and edit its existing definition instead of rerunning creation. If the directory is missing, create the content directory first; `create` does not create directories or reference material. Without an interactive terminal, supply `--yes` and the desired metadata and selection flags.

## Next steps

To use the authored pack, run `granary add <pack-directory>` from a consuming project. Keep any parent composition explicit; see [presets](../reference/presets.md).
