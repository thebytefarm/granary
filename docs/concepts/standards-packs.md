# Composable standards packs

Split the engineering reference into independent packs, then select a recommended preset for each language. Each of the seven directories under `packs/` owns its `granary.json`. Root `granary.json` composes three recommended presets by referencing those pack manifests. Granary itself installs only the five shared/TypeScript components selected by `bytefarm/recommended-typescript`; Rust and Python remain provided distribution material.

## Assessment before the split

The original `bytefarm/core-standards` bundle selected every Markdown file below `contributing/standards/`. It combined engineering workflow, functional TypeScript, documentation authoring, and agent instructions. Distribution now consists of seven independent packs and three recommended presets, without a duplicated core bundle.

The useful foundation is already present: immutable domain values, errors as values, pure transformations, isolated effects, explicit contracts, and real filesystem/process tests. Keep those principles across languages.

| Finding                                         | Evidence                                                                                                                                                                   | Required change before packaging                                                                      |
| ----------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Core is TypeScript-specific                     | The pack description names functional TypeScript; dependencies prescribes massaman, type-fest, and ESM checks                                                              | Extract language-neutral principles and move ecosystem choices into language packs                    |
| Repository policy leaks into reusable guidance  | File structure requires maltty command registration; Git rules require Granary package scopes; testing requires the repository CLI build                                   | Keep Granary operating requirements in contributor instructions and retain portable examples in packs |
| Subsets are not link-closed                     | TypeScript pages link to `../dependencies.md`; documentation standards link to TypeScript JSDoc                                                                            | Audit links at each new pack boundary and remove mandatory cross-language references                  |
| The reading index is incomplete                 | Documentation has standards, guides, quick starts, tutorials, references, troubleshooting, and runbooks pages absent from the README topic table                           | Give every component its own complete task-oriented entrypoint                                        |
| Enforcement claims exceed the configured checks | Documentation pages claim metadata/section checks; root validation invokes Ciderpress link/template checks and Almanac drift checks; oxlint enables correctness rules only | Identify actual checks by name and mark the rest as review requirements until checks exist            |
| Normative requirements and permissions overlap  | Dependency and release rules prescribe user approval inside the reference pack                                                                                             | Route authorization to the consuming repository's operating instructions                              |
| Composition is missing                          | Definitions expose `docs`, `code`, and `examples`; no dependency or preset fields exist                                                                                    | Introduce an approved composition contract rather than treating content groups as standards modules   |

The findings below motivated the split. Shared principles now have portable owners, TypeScript and documentation components have self-contained links and reading indexes, and enforcement notes distinguish executable checks from review requirements.

## Components

Each component owns its rules, README, and `granary.json`. Its manifest describes the pack directly through top-level `name`, `version`, `description`, `entry`, and `files`. Paths are relative to that directory; no single-item catalog wrapper is needed. The directory remains installable after copying it out of this checkout. Root presets pin member versions and sources without redeclaring their payloads.

| Pack                             | Owns                                                                                                                                                   |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `bytefarm/engineering`           | Change discipline, pure logic/effect boundaries, immutability, errors as values, dependency evaluation, testing principles, code-comment rationale     |
| `bytefarm/git`                   | Portable commit and pull-request conventions; repository-specific merge/release authorization stays with the consumer                                  |
| `bytefarm/documentation`         | Writing, formatting, diagrams, standards, guides, quick starts, tutorials, references, troubleshooting, runbooks                                       |
| `bytefarm/agent-instructions`    | Short operating contracts, canonical topic routing, managed-region preservation, pack/consumer boundaries                                              |
| `bytefarm/typescript-functional` | TypeScript contracts and naming, factories, readonly types, guards/matching, massaman Results/composition, JSDoc, native tooling                       |
| `bytefarm/rust-functional`       | Ownership/borrowing, enums, native Result/Option, iterator composition, effect boundaries, Rust-specific error and testing contracts                   |
| `bytefarm/python-functional`     | Typed Results, immutable domain data, pure functions, guarded matching, exception conversion at adapters, Python-specific typing and testing contracts |

Start with these capability boundaries. Do not create a separately versioned pack for every short topic page.

## Recommended sets

Recommended sets should select components, not duplicate their prose. Shared components install once in a polyglot workspace.

| Preset                            | Components                                                                 |
| --------------------------------- | -------------------------------------------------------------------------- |
| `bytefarm/recommended-typescript` | Engineering, Git, documentation, agent instructions, functional TypeScript |
| `bytefarm/recommended-rust`       | Engineering, Git, documentation, agent instructions, functional Rust       |
| `bytefarm/recommended-python`     | Engineering, Git, documentation, agent instructions, functional Python     |

Avoid a language-agnostic `recommended` preset that silently imposes TypeScript rules on Rust or Python. A polyglot project explicitly chooses its language sets.

## Installer contract

The repository root exposes the three recommended presets through `granary.json`. The `packs/` collection exposes seven independent pack manifests, and each component directory is also a standalone source. Explicit `--pack` selection installs several identities in one plan; a source with one pack selects it automatically. Sources can also use curated definitions and flat presets.

`--content` chooses payload categories, not standards capabilities. Presets instead declare ordered exact-version member requests. Their components own the actual documentation and are deduplicated by complete request identity.

The [preset schema](../reference/presets.md) expands each selected preset into ordinary leaf requests, preserving preset intent and its pinned definition in consumer metadata. Recursive preset dependencies are deliberately unsupported.

Preset resolution establishes:

- Exact member identities and versions, with concrete source revisions in the lock.
- Deduplication of identical members across selected presets.
- Explicit rejection of incompatible requests for the same identity.
- Preservation of preset intent and verified membership during restoration; update/removal lifecycle commands remain planned.
- Retrieval and preflight of the complete selected set before writing any member.
- An index that exposes the selected presets and canonical component entrypoints.

Install the current sets into a fresh consumer:

```sh
CONSUMER="$(mktemp -d)"
pnpm cli add "$PWD" --pack recommended-typescript recommended-rust recommended-python --cwd "$CONSUMER"
pnpm cli list --cwd "$CONSUMER"
```

Expect seven component packs and three preset records. Read `.context/INDEX.md` in the consumer for reading order and canonical entrypoints.

## Portable links and ownership

Separate installed identities live under separate versioned directories. Moving `typescript/` into its own pack breaks existing `../dependencies.md` links; installing both packs does not recreate their original relative layout.

Keep ordinary Markdown links inside a component. A shared principle has one owner; language pages explain its mechanics and identify the required shared component through their entrypoint. Route agents through the installation index instead of hard-coding another component's content version in links.

Presets need a reading order and explicit applicability. Two language packs can coexist, but Python guidance applies to Python and Rust guidance applies to Rust. Normative conflicts should be rejected or resolved explicitly, never by installation order.

## Functional Rust

Use native `Result`, `Option`, enums, exhaustive `match`, and iterator chains as the baseline. Rust already supplies much of massaman's control vocabulary.

The language pack prescribes:

- Return `Result<CONTENT, FAILURE>` for expected failures and propagate with `?`.
- Keep authored `panic!`, `unwrap`, and `expect` out of production domain paths; tests may assert their fixtures.
- Borrow inputs and return new domain values; do not mutate shared state or clone merely to silence an ownership problem.
- Use iterator transformations when they make the operation clear; keep mutation inside resource adapters when required by the API.
- Represent classified failures with enums and match variants instead of parsing error text.
- Use functions and explicit capability contracts without banning idiomatic structs, trait implementations, or constructors.
- Verify examples with Cargo tests/doctests, rustfmt, and Clippy in a disposable fixture.

Recommend `itertools` only for useful operations absent from the standard iterator vocabulary. It extends iterators; it is not needed to introduce Results. Keep error-derivation libraries and application diagnostic libraries separate from the underlying failure contract.

## Functional Python

The Python pack has the same authored exception prohibition as the TypeScript pack. It prescribes:

- Never author `raise` or `try`/`except` as application control flow.
- Return a typed `Result[CONTENT, FAILURE]` for fallible pure operations.
- Construct failure values instead of throwing, and classify failures by a typed variant rather than message text.
- Convert third-party exceptions in the owning adapter with `safe`, `impure_safe`, or `future_safe`; do not decorate whole workflows to hide internal programming errors.
- Do not use unchecked `.unwrap()` or `.failure()` calls in production paths; compose or match the established variant.
- Keep pure transformations independent of filesystem access, network access, logging, clocks, and framework state.
- Use immutable domain records and collections; a frozen record is not deeply immutable when its fields contain mutable lists or dictionaries.
- Prefer functions and injected capabilities over application inheritance. Declarative data/type definitions are distinct from mutable service classes.
- Keep async cancellation and process-level interrupts outside the ordinary domain failure model.
- Typecheck the actual examples with the supported checker/plugin combination and exercise adapters with real local resources.

`returns` is the recommended starting point for typed failures and composition. It provides Result/Maybe, IOResult, FutureResult, and context containers. Its decorator and composition typing relies on its mypy plugin; choosing a different checker requires a verified compatibility assessment.

Use standard-library iterators, comprehensions, `itertools`, and `functools` for ordinary transformations. Consider Toolz only for missing collection operations after verifying strict typing; its documentation describes the project as alive but inactive. It is an optional utility candidate, not the exception-handling foundation.

No library makes every Python operation incapable of raising. The enforceable contract is no authored exception control flow, protected third-party boundaries, and tested failure propagation. Assertions used by tests do not become domain error handling.

## Library research

Research snapshot: October 10, 2026. These are recommendations for future consumer projects, not dependencies installed into Granary.

| Candidate                                                | Verified release            | Role and limitation                                                                                                                                |
| -------------------------------------------------------- | --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| [returns](https://pypi.org/project/returns/)             | `0.29.0`, August 2, 2026    | Python typed containers; Python 3.11+, documented mypy plugin; [repository](https://github.com/dry-python/returns) showed approximately 4.4k stars |
| [itertools](https://docs.rs/itertools/0.15.0/itertools/) | `0.15.0`, September 8, 2026 | Optional Rust iterator extensions; native Results remain the baseline                                                                              |
| [Toolz](https://pypi.org/project/toolz/)                 | `1.2.0`, October 7, 2026    | Optional Python collection/composition utilities; maintainers describe limited ongoing development                                                 |

Sources: [returns Result documentation](https://returns.readthedocs.io/en/latest/pages/result.html), [returns mypy plugin](https://returns.readthedocs.io/en/latest/pages/contrib/mypy_plugins.html), [Rust Result](https://doc.rust-lang.org/std/result/), [Rust Iterator](https://doc.rust-lang.org/std/iter/trait.Iterator.html), and [Toolz documentation](https://toolz.readthedocs.io/en/latest/).

## Verification

The suite validates, installs, and restores each component from a separately copied directory without the repository root. It also verifies recommended-set installation, deduplication/conflicts, pinned Git restoration, failure-before-write behavior, and every installed local Markdown link. Component-content checks verify metadata and rationale/rules/enforcement headings. Rust examples compile and run in disposable fixtures when rustc is available. Python syntax and standard-library examples are checked with Python; returns runtime and strict plugin checks require those tools and report skipped verification when unavailable.

The [catalog overview](../../packs/README.md) routes readers to the seven canonical components and their recommended sets. Repository-specific commands and authorization remain in Granary's operating instructions. Legacy-format compatibility is verified by isolated fixtures rather than a second distributed standards bundle. See [context packs](context-packs.md), [curated definitions](../reference/pack-definition.md), and [installation](installation.md).
