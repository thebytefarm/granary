# Clients and plugins

Expose a small factory-based client that works without plugins. Prebuilt interpretation plugins are optional and compose through the same contracts as third-party plugins.

**Status:** implemented in the workspace, not yet published. Factories return clients directly; operations return Granary-owned plain typed outcomes. See the [API reference](../reference/core-api.md) for complete contracts.

## Base and composed clients

`createGranary()` constructs the base client: pack installation, lock inspection, reviewed updates, and plugin composition. It has no document interpretation by default.

`granary()` is the SDK entrypoint. It defaults to the current directory and no plugins; explicit registrations determine its additional capabilities. Neither factory changes persistent project configuration merely by constructing a client.

```ts
import { granary } from 'granary-ai'
import { defaultPlugins } from 'granary-ai/plugins'

const client = granary({ plugins: defaultPlugins() })
const installed = await client.packs.install()
if (!installed.ok) console.error(installed.error.message)

await client.packs.list()
await client.standards.toJSON()
await client.standards.toMarkdown()
await client.standards.toYAML()
```

All effectful operations return plain `Outcome<Value, Failure>` objects discriminated by `ok`; consumers need no `massaman` dependency. Invalid construction options and plugin setup throw errors with `kind: 'invalid'`. Standards conversions read, parse, and validate internally, returning content in memory without writing files. JSON returns JSON-compatible data; Markdown and YAML return strings. YAML uses JSON-compatible flow syntax, which is valid YAML 1.2. Markdown is an export, not a promise of lossless source reconstruction.

## Structured source inputs

```ts
await client.packs.add({
  source: {
    provider: 'local',
    path: '../granary/packs',
    pack: 'recommended-typescript',
  },
})
```

Git revisions accept exactly one of `branch`, `tag`, or `commit`; omission selects the remote default branch. Generic Git sources use `{ provider: 'git', repository, pack?, revision? }`. Local sources use `{ provider: 'local', path, pack? }` and reject Git revision selectors. Selection fields such as `files` and `output` belong beside `source`, not inside it. The client owns locator encoding; manifests and the CLI retain their compact syntax.

`client.updates.prepare()` prepares a review from declared intent without applying it. `client.updates.apply({ review })` applies resolved decisions through existing provenance, stale-state, and transactional checks. No separate client `diff()` or user-facing standards `setup()` is needed.

## Plugin definition

`definePlugin()` always returns a callable plugin factory. Its input is either a definition object for an unconfigured plugin or an arrow callback that receives options and returns a configured definition.

```ts
const notesPlugin = definePlugin({
  name: 'notes',

  setup({ content }) {
    return { read: () => content.text({ path: 'README.md' }) }
  },
})
```

Configured plugins use the same definition shape:

```ts
const notesPlugin = definePlugin((options: { readonly path: string }) => ({
  name: 'notes',

  setup({ content }) {
    return { read: () => content.text({ path: options.path }) }
  },
}))
```

Use an arrow for the configuration callback and method syntax for `setup`. Standalone implementation functions retain named function declarations. Plugin authoring modules may default-export the `definePlugin()` result.

## Registration and lifecycle

```ts
import { granary } from 'granary-ai'
import { standardsPlugin } from 'granary-ai/plugins/standards'

const client = granary({
  project: process.cwd(),
  plugins: [standardsPlugin()],
})

await client.standards.toJSON()
```

- `plugins` is an array, never a keyed registration object.
- Calling the plugin factory captures options and returns its definition. It does not initialize project resources.
- Core invokes synchronous `setup(context)` once for each client construction. Setup wires capabilities; file reads, parsing, and other async work happen in their methods.
- The returned readonly API is mounted under the plugin's literal `name`, with its type inferred from the supplied plugins. There is no intermediate `.documents` namespace.
- Duplicate plugin names and collisions with core capability names are errors. There are no implicit registrations to replace or collide with.
- Plugins compose capabilities without mutating the client or using `this`, inheritance, or global registration. Reusing a plugin registration must not share mutable client state.

## Content interpretation

The standards plugin owns its parsing, validation, enforcement interpretation, and conversions. Custom plugins can compose reusable parser utilities or use another parser entirely; there is no second parser registry to configure.

Ordinary content stays readable without plugins. XML in a file does not automatically classify or execute it. Preserve original content and provenance; ignore tags in code examples when interpreting authored markup. Content-pack installation never automatically loads executable plugin code.

Plugins are trusted application code, not a security sandbox. Core supplies narrow content-reading capabilities rather than installation transaction internals. Locking, ownership checks, and reviewed writes remain core responsibilities.

## Package ownership

`@granary/core` owns the installation engine and `definePlugin()` contract. `@granary/sdk` owns `granary()` and depends only on core. `@granary/plugins` owns standards and the opt-in `defaultPlugins()` preset, and re-exports the core plugin definition helper. `@granary/cli` owns terminal commands. `granary-ai` combines SDK exports, plugin subpaths, and the executable without starting the CLI on import. Component packages are workspace-private until separately approved for publishing.

Core never imports a prebuilt plugin. Namespaced `plugins.<name>` manifest settings are JSON data; plugin registration remains explicit application code. Each plugin validates its own configuration. Standards uses `plugins.standards`, not a special top-level field.

Registered definitions may implement `validateUpdate` to inspect detached upstream and effective document views before core prepares a transaction. The standards plugin uses it to validate classified markup and preserve configured rule identities. A rejected validation prevents writes; the engine's provenance and stale-state checks remain mandatory even without plugins.

Writing authored XML or synchronizing a typed model back into source is outside this shipping cut. Humans and agents author the markup; plugins read and export it.
