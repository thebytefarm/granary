# Create a context pack

Describe an existing directory with `granary.json` and validate its metadata.

## Prerequisites

- A built local Granary workspace
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

## 3. Add the manifest

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

The directory owns its identity and can be distributed independently. `version` and `description` are optional. Grouped `files` selects any file type, including source and examples. Without `files` or child `packs`, the source's regular files are selected; explicit selection keeps incidental material out. Granary chooses `README.md` when selected, otherwise the first selected file, as the navigation entrypoint. Add child `packs` to compose other selections. See [project configuration](../reference/project-config.md#unified-fields).

## 4. Validate it

From the Granary workspace root:

```sh
granary validate --cwd context/framework
```

Use an absolute `--cwd` path if the pack is outside the workspace.

## Verification

Expect `Pack manifest is valid.` Standalone validation checks syntax and fields; installation checks local file selection and entrypoint inclusion. Check that the entry's links resolve and the selection contains the intended material. Presets can reference this directory's manifest without redeclaring its payload; see [presets](../reference/presets.md).

The [manifest reference](../reference/pack-manifest.md) defines every field. The [installation guide](install-packs.md) describes the consumer workflow.
