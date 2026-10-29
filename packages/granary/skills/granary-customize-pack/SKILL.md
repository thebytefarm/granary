---
name: granary-customize-pack
description: Customize installed Granary reference material while preserving upstream provenance. Use when a project intentionally changes installed standards, examples, applicability, or consumer enforcement mappings.
---

# Customize installed context

1. Read project instructions, `granary.json`, `granary-lock.json`, and `.context/INDEX.md` (or the configured output). Identify the exact pack, group, version, and source file. Inspect existing differences first.
2. Choose the right owner. A project's lint/check mapping belongs in `granary.json` under `standards.rules`. Changes to the guidance itself belong in local content. Preserve standard and rule IDs when their identities are unchanged.
3. Run `granary standards --setup` once for a structured consumer config if it lacks enforcement settings. This records review-only defaults and preserves existing mappings. Configure only real blocking checks. Qualified IDs use `pack#standard/rule`.
4. Make the requested local change. Keep the why, examples, requirement wording, and XML boundaries coherent. Do not edit upstream hashes in the lockfile to make customized content appear original.
5. Run `granary standards` to validate installed standards. Inspect `provenance.customized`, authored enforcement, and `effectiveEnforcement`. Unknown mapped rule IDs are errors. For ordinary context, check links and any executable examples relevant to the edit.
6. Keep intentional local content under the project's version-control policy. To accept it for restoration, prepare `granary update` from declared manifest intent, review the per-file choices, and use `granary update --apply <review.json>` only with authorization. The review captures composition and its members together. The accepted lock stores local results separately from upstream hashes; `install` restores those results and still rejects later unaccepted edits. Upstream access/integrity requirements remain in force.

## Enforcement configuration

```json
{
  "default": "[review]",
  "rules": {
    "example/team-standards#immutable-values/preserve-inputs": {
      "markers": ["[lint: immutable-inputs]", "[review]"],
      "notes": "The check covers arrays; review resource handles."
    }
  }
}
```

Place this object under the root `standards` key, preserving `packs` and other manifest settings. Use the identities returned by `granary standards`, not guessed authored names. Do not change MUST/MAY levels to express enforcement. A mapping does not install or run a checker.
