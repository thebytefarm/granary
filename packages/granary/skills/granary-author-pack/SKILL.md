---
name: granary-author-pack
description: Author a reusable Granary pack and its extractable standards. Use for explicit pack-authoring requests, not ordinary context installation, framework docs, or copied application code.
---

# Author a Granary pack

Use this procedure only to create or maintain an authored reusable pack definition. An installation in `.granary/context/` or a source entry in a consumer's `granary.json` does not by itself establish a pack-authoring task. Do not turn ordinary installed docs or copied code into a pack unless explicitly asked.

1. Read the repository's operating instructions and the existing pack's `granary.json`. Preserve its identity, version intent, selected files, and local changes unless the task changes them.
2. Classify documents deliberately. Unlisted files are `context`. `documents` maps exact selected file paths to `standards` or `context` inside the owning pack definition. Paths are relative to its source root; unsupported kinds and unselected paths are errors.
3. Write ordinary context as Markdown. For standards, use the complete shape below. Keep IDs stable when editing wording, rationale, examples, or file placement. Standard IDs are unique within the pack; rule IDs are unique within their standard.
4. Check the pack with `granary validate --cwd <pack-directory>`. Extract and validate its standards with `granary standards --source <pack-directory>`. Check the JSON retains the rationale, complete code examples, literal levels, and enforcement. Inspect a source without a lockfile using `--source`; omit it only when inspecting installed packs.
5. Report the changed concepts and verification result. Do not publish, push, or change a consumer's enforcement mappings as a side effect of authoring.

## Standalone manifest

```json
{
  "name": "example/team-standards",
  "version": "0.1.0",
  "description": "Team guidance and extractable standards.",
  "documents": { "immutability.md": "standards" }
}
```

## Complete standard

````markdown
<standard id="immutable-values">

## Immutable values

<why>
Callers may retain the original collection. Return a new value to preserve it.
</why>

<rules>
<rule id="preserve-inputs">
- <level>MUST NOT</level> mutate function arguments. <enforcement>[review]</enforcement>
</rule>
</rules>

<examples>
```ts
function appendName(names: readonly string[], name: string): readonly string[] {
  return [...names, name]
}
```
</examples>

</standard>
````

Only `name` is required. Set `files.include` explicitly for a focused pack, such as `["README.md", "**/*.md"]`; a leaf without `files` defaults to regular files, not just Markdown. A composition-only pack declares its members in `packs`.

Each standard needs a Markdown heading and exactly one `why`, `rules`, and `examples` region. Rationale and rules must be nonempty; examples may be explicitly empty for self-evident guidance. Preserve real examples in full. An optional standard-level `enforcement` region retains shared coverage notes. Each rule needs a statement, exactly one `level`, and one `enforcement`. Supported literal levels: MUST, MUST NOT, SHOULD, SHOULD NOT, MAY.

Start authored enforcement at `[review]`. Keep each rule's enforcement tag inline with its normative bullet. The value inside `enforcement` is bracket text, not a self-closing XML review element. `[lint: check-id]` means an actual blocking check; keep `[review]` and explain gaps for partial coverage. Consumer settings, not the existence of a linter dependency, establish effective enforcement.
