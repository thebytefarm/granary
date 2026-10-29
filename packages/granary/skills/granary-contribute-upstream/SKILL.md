---
name: granary-contribute-upstream
description: Prepare reusable Granary pack customizations for upstream contribution. Use when a consumer wants to send selected local standards, context fixes, or examples back to the pack author without including project-specific policy.
---

# Contribute a customization upstream

1. Read the consumer's instructions and installed provenance. Identify the original repository, accepted revision, pack root, standard IDs, and the requested contribution. Do not assume a locally installed pack's source is the repository's current origin.
2. Inspect baseline versus local content with `granary update`, saving its read-only review output in a new file. All three versions are included. Separate the local delta from incoming upstream changes; do not attribute upstream improvements to the consumer. Preparation uses declared sources; do not apply this review while preparing a contribution.
3. Select the reusable subset with the user. Exclude project-only commands, private examples, enforcement mappings, and local policy unless the upstream pack explicitly owns them. Preserve relevant rationale and examples alongside each rule change.
4. Inspect the upstream repository's contribution instructions. Prepare the selected edits in a clean upstream checkout using its conventions. Stable IDs should remain stable unless this contribution deliberately changes identity. Do not copy the entire installed tree over upstream content.
5. Run upstream validation and `granary standards --source <pack-directory>` for structured standards. Present the scoped patch and evidence, including changes to requirement levels or enforcement claims.
6. Push or open a pull request only with the user's authorization. For GitHub work, use `gh`. Accepting a customization locally does not authorize publishing it. Keep the consumer's content and lock unchanged while preparing the contribution.

After upstream accepts the contribution, use the update-review skill to inspect that revision. Upstream acceptance does not automatically replace local content or accept a new baseline.
