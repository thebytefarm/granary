# Client and core API

`granary-ai` combines SDK exports, optional plugin subpaths, and the `granary` executable. Importing its root never starts the CLI. The workspace separates `@granary/core`, `@granary/sdk`, `@granary/cli`, and `@granary/plugins`; these component packages remain private and have not been independently published.

## Client construction

```ts
import { granary } from 'granary-ai'

const client = granary()
const added = await client.packs.add({
  source: { provider: 'github', owner: 'vercel', repo: 'next.js', revision: { tag: 'v16.0.0' } },
  files: { include: ['docs/**', 'examples/**'] },
  output: 'reference/next',
})
if (!added.ok) console.error(added.error.kind, added.error.message)
```

`granary({ project?, plugins? })` constructs a client directly, defaulting to the current directory and no plugins. `createGranary({ project, plugins? })` is the low-level constructor exposed through `granary-ai/core`. Neither performs project reads or writes during construction, except effects authored by trusted plugin setup functions. Invalid project options, invalid/duplicate/reserved plugin names, and failed/asynchronous plugin setup throw an Error with `kind: 'invalid'`. Project paths are resolved at construction. Relative local sources are resolved from that project, never by changing process-global working directory.

Every operation returns Granary's plain `Outcome<Value, Failure>` union, exported from `granary-ai`. Success is `{ ok: true, value, error: null }`; failure is `{ ok: false, value: null, error }`. Check `ok` before accessing the payload. No `massaman` imports, helpers, or types are required. Failures use `invalid`, `io`, `conflict`, or `drift`. Missing project configuration, unsafe paths, source failures, conflicts, stale reviews, and changed provenance return failed outcomes at operation time rather than throwing.

## Nested capabilities

| Method                                              | Contract                                                                                                                                                                                 |
| --------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `packs.add({ source, files?, output? })`            | Adopt a source into granary.json and install transactionally. Existing sources require reviewed updates.                                                                                 |
| `packs.install()`                                   | Read current intent and restore locked content without advancing revisions.                                                                                                              |
| `packs.list()`                                      | Return locked leaf records; a missing lock returns an empty array.                                                                                                                       |
| `packs.find({ source })`                            | Read root metadata and declared members, including nested compositions. Never scan undisclosed directories or historical manifest filenames. Manifestless sources return no named packs. |
| `locks.read({ required? })`                         | Return the full lock, including composition; required defaults to true. False permits an empty missing lock.                                                                             |
| `updates.prepare()`                                 | Capture a portable review from declared sources without applying it. Edit granary.json to change selections.                                                                             |
| `updates.apply({ review })`                         | Validate an unknown review and apply resolved decisions after provenance and stale-state checks.                                                                                         |
| `content.read({ path })` / `content.text({ path })` | Read checked project-relative bytes/text, rejecting traversal and unsafe symlinks. No automatic interpretation.                                                                          |
| `standards.toJSON()`                                | With the standards plugin registered, read, parse, and validate complete standards and effective enforcement in memory.                                                                  |
| `standards.toMarkdown({ target? })`                 | Return Markdown or Greptile Markdown; defaults to `markdown`.                                                                                                                            |
| `standards.toYAML()`                                | Return YAML 1.2 in JSON-compatible flow syntax, retaining the same data as `toJSON()`.                                                                                                   |

`source` is `{ provider: 'github', owner, repo, pack?, revision? }`, `{ provider: 'git', repository, pack?, revision? }`, or `{ provider: 'local', path, pack? }`. Revisions accept exactly one of `{ branch }`, `{ tag }`, or `{ commit }`; omission uses the remote default branch. Local revision selectors and unknown fields are invalid. A pack name selects a declared member, not a filesystem directory. File selection and output stay outside `source`; explicit output follows the [manifest destination contract](pack-manifest.md).

Methods reread project intent. Clients do not retain mutable lock/config caches. YAML conversion does not write a YAML file; Markdown is not a lossless source round trip. Website sources are not implemented.

Installation and restoration operate on bytes and document-kind metadata without requiring interpretation plugins. Standards conversion validates classified markup when requested. When registered, the standards plugin validates upstream and effective reviewed documents and configured rule identities before application. The CLI explicitly registers the recommended plugins for reviewed updates. SDK callers choose their own registrations; saved configuration never automatically loads executable plugins.

## Plugins

```ts
import { granary } from 'granary-ai'
import { definePlugin, standardsPlugin } from 'granary-ai/plugins'

const notesPlugin = definePlugin((options: { readonly path: string }) => ({
  name: 'notes',
  setup({ content }) {
    return { read: () => content.text({ path: options.path }) }
  },
}))

const client = granary({
  project: process.cwd(),
  plugins: [standardsPlugin({ source: './packs/engineering' }), notesPlugin({ path: 'README.md' })],
})
await client.notes.read()
await client.standards.toMarkdown()
```

`definePlugin()` accepts either a definition object (producing a zero-argument factory) or an arrow configuration callback (preserving its parameter types and defaults). `setup({ project, content })` runs synchronously once per client and returns a readonly capability mounted under the literal `name`. APIs and namespaces are shallow-frozen, not deeply frozen application data. Plugins are trusted code; content installation never loads them automatically. See [clients and plugins](../concepts/client-plugins.md).

`defaultPlugins()` from `granary-ai/plugins` returns a readonly tuple containing the standards registration. It is opt-in: use `granary({ plugins: defaultPlugins() })`. Definitions may also provide `validateUpdate(update)`, returning a plain typed outcome. Core invokes registered validators after provenance and review-state checks, before transaction preparation. Each receives detached upstream/effective content views, affected names, and pending namespaced configuration; rejected promises and failed outcomes prevent writes. Apply revalidates even if the review was prepared earlier.

Plugin settings live under `granary.json`'s `plugins.<name>` as JSON data. Core validates and preserves the namespace envelope; each plugin owns validation and interpretation of its settings. Top-level `standards` settings are not accepted. The standards plugin uses `plugins.standards`.

## CLI integration

Maltty handlers construct SDK clients directly and present failures with `ctx.fail()`. There is no CLI client factory. Operations reread workspace intent; public construction options do not accept internal configuration.

The CLI validation schemas come from `@granary/core/schemas`. The executable belongs to `@granary/cli`; the convenience package calls its explicit `run()` entrypoint. Importing that library does not execute a command.

## Internal ownership

Installation's client coordinates snapshot capture, customization materialization, pure planning, and checked transactions. Other capabilities use that client rather than snapshot or transaction internals. Source and standards failures belong to their capabilities; filesystem failures belong to the bound filesystem factory. Low-level filesystem helpers are private, including the operations used during rollback.

Core has no dependency on SDK, CLI, or prebuilt plugins. SDK depends only on core. Prebuilt plugins depend on core's public resource capabilities, not installation internals. Standards markup parsing and its `marxml` dependency belong exclusively to the plugins package. Core's document reader owns destination resolution, effective customizations, and provenance for interpretation plugins.
