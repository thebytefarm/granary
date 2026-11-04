# Granary

Install versioned docs, source, and examples where your coding agent can read them.

## Install

Requires Node.js 26+ and Git. macOS and Linux are supported.

```sh
npm install --global granary-ai
granary --version
```

## Usage

### Add framework docs

Run from your project root:

```sh
granary add nextjs@16
granary list
```

Granary installs Next.js documentation, not the Next.js dependency. It records the exact stable tag and commit in `granary.json` and `granary-lock.json`, then links the installed reference entrypoint directly in a managed region of `AGENTS.md`. Your existing instructions stay intact.

Commit those three root files. Installed context and cache files under `.granary/` are Git-ignored. Teammates restore the same selection with:

```sh
granary install
```

Next.js 15 and 16 support numeric major, minor, and exact stable versions. Other repositories and local folders can be selected through `granary.json` or `granary add ./reference`.

### Review updates

```sh
granary update > review.json
granary update --apply review.json
```

Inspect the review and resolve deferred or conflicting decisions before applying it. Accepted local edits are retained in the lock; restoration never silently replaces later edits.

### Use the SDK

For application code, install locally with `npm install granary-ai`:

```ts
import { granary } from 'granary-ai'

const result = await granary().packs.list()
if (result.ok) console.log(result.value)
```

Importing the SDK does not start the CLI. Optional plugins are available through `granary-ai/plugins`. Maintenance skills ship under `granary-ai/skills/` and are installed into your agent harness separately.

This is an early release. Website ingestion, hosted registries, and Windows support are not implemented.

[Source, documentation, and examples](https://github.com/thebytefarm/granary)

MIT licensed.
