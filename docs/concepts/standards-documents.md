# Standards documents

Represent standards as readable Markdown with extractable structure, including their rationale, rules, examples, and enforcement.

**Implemented:** explicit document kinds, marxml-backed validation, complete JSON/Markdown extraction, a Greptile Markdown exporter, and review-default consumer enforcement. Executable transforms remain deferred.

## Document kinds

A document kind describes how Granary interprets a document. A pack remains the versioned distribution unit and can contain multiple document kinds. Recommended packs continue to compose packs.

| Kind        | Purpose                                                                                    |
| ----------- | ------------------------------------------------------------------------------------------ |
| `context`   | Ordinary reference material: guides, API documentation, architecture, source explanations. |
| `standards` | Explicit rules with rationale, examples, and enforcement information.                      |

Existing documents default to `context`. Authors opt documents into `standards`; Granary does not infer the kind from a filename or the presence of MUST. Future kinds can define their own validation and extraction behavior without changing what a pack means. Unsupported kinds produce a validation error.

The optional `documents` mapping classifies exact selected paths. Standalone manifests put it at the top level; grouped definitions put it inside each content group, relative to that group's root. Catalog leaves also accept the mapping. Installation validates declared paths and records their kinds in the lockfile. Interpretation and installation groups (`docs`, `code`, `examples`) remain separate concerns.

```json
{
  "documents": {
    "README.md": "context",
    "immutability.md": "standards"
  }
}
```

## Preserve the complete standard

Use marxml to identify semantic regions inside Markdown. Extract the complete standard, not just its imperative sentences:

- A stable standard ID and title.
- Why the standard exists.
- Individually identified rules and their requirement levels.
- Examples, including code fences, captions, and links.
- Enforcement markers and coverage notes.
- Provenance: pack identity, version, source revision when available, and document path.

Keep Markdown inside those regions. A consumer should be able to retain explanations and runnable examples without flattening everything into plain text or inventing a tag for every paragraph.

## Requirement levels stay in the text

Keep **MUST**, **MUST NOT**, **SHOULD**, **SHOULD NOT**, and **MAY** in the authored sentence, with their RFC 2119/8174 meanings. Wrap the literal keyword in `<level>` so a parser can extract it without inferring obligation from prose.

A complete standard:

````markdown
<standard id="immutable-values">

## Immutable values

<why>

Callers may retain the original value. Returning a new value keeps a local
transformation from changing another caller's state.

</why>

<rules>

<rule id="preserve-inputs">

- <level>MUST NOT</level> mutate function arguments. <enforcement>[review]</enforcement>

</rule>

<rule id="return-new-values">

- <level>MUST</level> return a new value when a transformation changes domain data. <enforcement>[review]</enforcement>

</rule>

</rules>

<examples>

### Return the updated value

The caller keeps its original array while receiving the appended result.

```ts
function appendName(names: readonly string[], name: string): readonly string[] {
  return [...names, name]
}
```

</examples>

</standard>
````

Standard and rule IDs remain stable when wording or file placement changes. A rule's qualified identity is `pack#standard/rule`, for example `example/team-standards#immutable-values/preserve-inputs`. Intentional identity changes need a migration strategy; extraction rejects mappings to unknown rule IDs.

## Enforcement markers

The value inside `<enforcement>` uses readable bracket markers, not XML elements such as a self-closing review tag:

Keep a rule's enforcement tag on the same line as its normative bullet. Standard-level coverage notes remain a separate block.

| Marker               | Meaning                                                                   |
| -------------------- | ------------------------------------------------------------------------- |
| `[review]`           | A reviewer checks the rule; no configured blocking check is claimed.      |
| `[lint: <check-id>]` | A named automated check blocks violations within its documented coverage. |

Here, `lint` includes linters, static analysis, and invariant tests. A check ID identifies a real check in the consuming project. A warning-only check or a check exempting the relevant files does not establish blocking coverage.

This follows the distinction in [PostHog's architecture guidelines](https://github.com/PostHog/posthog/blob/master/AGENTS.md#architecture-guidelines): `[lint: <id>]` identifies machine enforcement, while `[review]` identifies a reader as the control. These annotations describe enforcement; writing one does not install or execute a check.

Requirement level and enforcement are independent. A MUST can be review-only. When automation covers part of a rule, retain `[review]` alongside the lint marker and explain the remaining coverage gap in the enforcement region. That explanation is extractable too.

**Start every Granary-authored rule with `[review]`.** Do not infer lint coverage from the repository having a linter installed. All seven shipped standards components now use stable IDs and review-only authored markers. README indexes remain ordinary context.

Each standard has one `why`, `rules`, and `examples` region. `examples` may be explicitly empty for self-evident guidance; do not invent a code example just to fill it. An optional standard-level `enforcement` region retains shared coverage notes as `enforcementNotes`, while each rule still has its own bracket markers.

## Setup and consumer configuration

Enforcement is a setup and configuration choice. The default is `[review]`; projects can map stable rule identities to checks they actually run.

The configuration model supports:

- A review-only default when setting up standards consumption.
- Per-rule mappings to one or more `[lint: <check-id>]` markers.
- A retained review marker and coverage notes for partially automated rules.
- Validation of mappings against the selected standards, with diagnostics for unknown rule IDs.

Preserve both authored enforcement and effective consumer enforcement in extraction. A project's mapping must not rewrite upstream source or change a rule's requirement level. Setup should make mappings explicit rather than declaring automation based on detected tooling alone.

Run `granary standards --setup` in a project with a structured `granary.json` to record review defaults while preserving existing mappings. Add per-rule settings under `standards.rules`; see [project configuration](../reference/project-config.md#standards-enforcement). Setup does not detect or install checkers. File-specific applicability remains future work.

## Extraction and exports

The extraction pipeline is:

```text
Installed documents
  -> classify document kind
  -> parse and validate standards with marxml
  -> normalize complete standards with provenance
  -> resolve consumer enforcement mappings
  -> export to a target format
```

The normalized representation retains rationale, rule text with its literal requirement keyword, examples, enforcement markers, coverage notes, and source information. Rule-focused output also needs the parent standard's context, either embedded or linked by stable identity.

`granary standards` extracts installed documents as JSON on stdout. `granary standards --source ./packs/my-pack` inspects local leaf packs without installing them. For a composite-only catalog, inspect its leaf sources separately. JSON includes complete markup, rationale, examples, rules, authored enforcement, effective enforcement, and upstream/current hashes. Local edits are reported as customized without changing the lockfile.

Parsing and schema validation reject malformed markup, duplicate identities, missing required sections, and invalid levels. A Markdown-aware adapter keeps tags inside fenced and inline code out of the authored rule tree while retaining original example bytes.

Use `--format markdown` for a complete readable export, or `--format greptile` for content suitable for `.greptile/rules.md`. Both retain authored concepts, original examples, qualified rule IDs, effective controls, and provenance. The [Greptile configuration contract](https://www.greptile.com/docs/code-review/greptile-config) treats that Markdown file as review context for its containing directory; the exporter does not infer severity or install CI gates.

Executable transforms through a possible `granary.config.ts` remain deferred. The supported exporters do not execute project code.

## Authoring and maintenance

The CLI package ships skills for authoring, customization, upstream-update review, and contributions. The [pack maintenance concept](pack-maintenance.md) describes three-way previews, reviewed application, and customized restoration. See [using the skills](../guides/use-granary-skills.md).
