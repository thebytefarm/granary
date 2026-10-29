# Pack maintenance and skills

Treat installed reference material as content a project may intentionally customize, with explicit review when upstream changes arrive.

**Implemented:** retained baselines, read-only three-way previews, reviewed update application, durable accepted customizations, customized restoration, and shipped maintenance skills. Later unaccepted edits remain protected.

## Local ownership

A consumer may adapt a pack to its project: clarify a rule, add an example, or narrow applicability. Like shadcn's local-ownership model, those changes can be wanted and durable. An upstream update should not assume that every local difference is accidental drift.

Keep these facts separate:

| Fact                   | Purpose                                                             |
| ---------------------- | ------------------------------------------------------------------- |
| Upstream baseline      | The exact original content the project last accepted.               |
| Local working content  | The files the project currently uses, including its customizations. |
| Incoming upstream      | The candidate source revision being reviewed.                       |
| Consumer configuration | Project-specific settings, such as enforcement mappings.            |

Use configuration for supported project choices, such as mapping a rule to a local lint check. Use content customization when the actual guidance needs to differ. Neither should silently change the recorded upstream provenance.

## Review updates with three versions

Compare the baseline, local content, and incoming upstream content. A two-way diff between local and incoming files cannot reliably distinguish a project customization from an upstream change.

`granary update` prepares a comparison from declared manifest sources. Edit `granary.json` first to change revisions, selections, or membership. There is no separate diff command or candidate-source argument.

JSON includes complete versions and classifies files as `unchanged`, `upstream`, `local`, `identical`, or `conflict`. Missing versions are `null`; binary versions use base64. Renames appear as deletion/addition pairs. The preview changes no installed files, config, or lock intent.

The reviewed update workflow:

1. Run `granary update` and save stdout as a new review JSON file. It captures candidate upstream bytes, composition, and lock metadata without modifying installed files.
2. Inspect all three versions and the proposed decisions. Unchanged, upstream-only, and identical changes default to `incoming`; local-only changes default to `local`. Conflicts start at `defer`.
3. Choose `incoming`, `local`, or `merge` per file. For `merge`, provide `merged` content using the file's recorded encoding; `null` selects deletion. Any `defer` blocks the entire apply. Do not edit pinned metadata to hide a pack or file.
4. Run `granary update --apply review.json` after authorization. It verifies the captured config/lock hashes, complete local file set, candidate hashes, entrypoints, standard identities/structure, and affected consumer rule mappings. A stale review fails before writes. Apply uses the captured candidate bytes rather than fetching a moving ref again.
5. Payloads, accepted upstream metadata, and separate customization records pass through the existing preflight and recovery transaction. Keep the review file until the operation and relevant link/example checks succeed.

Retaining a customization accepts the incoming revision as the new upstream baseline while recording a different local result. The next preview reports that difference as local, not as the same new upstream change forever. `defer` accepts nothing; no lock or payload changes are written while a choice remains unresolved.

Never automatically delete a locally customized standard just because upstream removed it. Surface the removal for a decision. Rule IDs help align standards across changes, but they do not make conflicting edits safe to merge without review.

A pack removed from manifest intent can be removed when every chosen file result is absent. Keeping content from an entirely removed pack requires a separate consumer-owned pack; apply rejects retention instead of inventing an upstream baseline. Destination moves remove reviewed old payload paths and write selected results at the new destination. Empty directories and cache files may remain.

## Baseline and restoration requirements

New installations retain original upstream file contents under `.granary/cache/baselines/<sha256>`, shared across all project outputs. The generated `.granary/.gitignore` ignores both this cache and default installed context. The cache participates in installer preflight and recovery. Comparison verifies each baseline against its locked hash.

For older installs or missing cache entries, unchanged installed bytes can recover a baseline when their hash matches the lock. Otherwise the preview tries the locked source. Git content may be recovered from a reachable locked commit; local sources may no longer contain their previous bytes. An unavailable baseline fails explicitly. Restoration still verifies upstream sources; the cache does not make `install` an offline restore command.

Each updated locked pack may contain `customizations`: group-relative paths, base64 materialized local content, separate hashes, optional document kinds, or a null content/hash pair for accepted deletion. This tracked data reproduces local additions and retained files even when those paths no longer exist upstream. Treat it as project content and inspect it for secrets before sharing.

`install` verifies upstream sources, validates accepted customization hashes and standards, then restores the effective result. Missing accepted files are recreated. Present files must match their accepted local hashes; later unaccepted edits fail rather than being overwritten. An accepted deletion must remain absent. The accepted upstream and local-result hashes are never substituted for each other.

## Shippable skills

The CLI package ships skill documents under `skills/`. Reference packs explain the concepts; skills guide an agent through supported procedures.

| Skill               | Agent task                                                                                                     |
| ------------------- | -------------------------------------------------------------------------------------------------------------- |
| Author a pack       | Create or edit context and standards documents, maintain metadata, and validate the resulting pack.            |
| Customize a pack    | Inspect installed provenance, explain the intended local change, preserve stable rule IDs, and verify exports. |
| Review an update    | Preview the three-way diff, explain each consequential change, collect decisions, and validate the result.     |
| Contribute upstream | Separate reusable improvements from project customizations and prepare a focused contribution for review.      |

The standards-authoring procedure needs to preserve literal MUST/MAY wording, the complete rationale and examples, and bracketed enforcement markers described in [Standards documents](standards-documents.md). All initial authored enforcement is `[review]`; a consumer's setup or configuration may map rules to its own checks.

Skills explain preconditions and observable results, including authorization before applying decisions. See [using the skills](../guides/use-granary-skills.md) for installation. Context-pack installation does not automatically register skills with an agent harness.

## Contributions back upstream

An incoming update and an outgoing contribution are different workflows. The contribution skill compares the local customization with the accepted baseline, identifies changes useful to other consumers, and helps the author prepare only that subset for upstream review.

Keep project-specific commands, enforcement mappings, private examples, and local policy out of a reusable contribution unless the upstream pack explicitly owns them. Show the proposed patch and its validation evidence before creating a contribution. Publishing, pushing, and opening a pull request follow the user's authorization and the upstream repository's instructions.

Accepting a local change does not authorize publishing it. Upstream acceptance also does not silently replace the consumer's local content; the normal update review incorporates that revision later.

## Boundaries

Reviews are explicit files, not an interactive merge UI. Renames remain deletion/addition pairs, and merges are supplied by the reviewer rather than guessed automatically. Concurrent installers and crash-safe multi-file commits are not supported. Applying an update is not permission to publish a contribution.

The [installation model](installation.md) remains the restoration contract.
