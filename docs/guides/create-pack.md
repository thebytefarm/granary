# Create a context pack

Describe an existing directory with `granary.json` and validate its metadata.

## Prerequisites

- A built local Granary workspace
- A directory containing useful docs, source, or examples
- An entry file that introduces and indexes the material

## 1. Choose the pack root

Keep the files required to read the pack under one directory:

```text
context/framework/
  granary.json
  README.md
  docs/
    api.md
  source/
    client.ts
  examples/
    request.ts
```

One source repository can contain several directories shaped this way.

## 2. Write the entry file

In `README.md`, describe when the material is useful and link to its topics using relative paths:

```md
# Framework reference

Reference material for the framework's client API.

- [API](docs/api.md)
- [Client implementation](source/client.ts)
- [Request example](examples/request.ts)
```

The entry file is a reading map. Keep detailed reference material in its owning files.

## 3. Add the manifest

```json
{
  "name": "example/framework-reference",
  "version": "0.1.0",
  "description": "Client API documentation, implementation, and examples.",
  "entry": "README.md",
  "files": ["README.md", "docs/**/*.md", "source/**/*.ts", "examples/**/*.ts"]
}
```

The directory owns its identity, version, and selection, so it can be distributed independently. This leaf installs its selected files as one `docs` group. Use a [curated definition](../reference/pack-definition.md) for separate docs, code, and examples groups. The content version tracks the pack itself; record the upstream framework version and revision in its reference material.

## 4. Validate it

From the Granary workspace root:

```sh
pnpm cli validate --cwd context/framework
```

Use an absolute `--cwd` path if the pack is outside the workspace.

## Verification

Expect `Pack manifest is valid.` Standalone validation checks syntax and fields; installation checks local file selection and entrypoint inclusion. Check that the entry's links resolve and the selection contains the intended material. Presets can reference this directory's manifest without redeclaring its payload; see [presets](../reference/presets.md).

The [manifest reference](../reference/pack-manifest.md) defines every field. The [installation guide](install-packs.md) describes the consumer workflow.
