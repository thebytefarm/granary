---
name: granary-customize-pack
description: Customize an installed authored Granary pack while preserving upstream provenance. Not for arbitrary installed context, framework documentation selections, or copied application code.
---

# Customize an installed pack

Use this procedure only when the target belongs to an authored reusable pack definition (local or upstream). Confirm that definition and provenance first. A consumer source entry, curated framework selection, installed directory, or lock entry alone is not enough. For ordinary context or copied code, follow the requested edit and repository instructions without imposing pack-maintenance steps. Existing installer edit protection still applies.

1. Read project instructions, including the `<granary-context>` reference links in root `AGENTS.md`, `granary.json`, and `granary-lock.json`. Identify the exact pack, group, version, and source file. Inspect existing differences first.
2. Choose the right owner. A project's lint/check mapping belongs in `granary.json` under `plugins.standards.rules`. Changes to the guidance itself belong in local content. Preserve standard and rule IDs when their identities are unchanged. Skip standards-specific steps for a pack containing only ordinary context.
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

Place this object under `plugins.standards`, preserving `packs` and other manifest settings. Use the identities returned by `granary standards`, not guessed authored names. Do not change MUST/MAY levels to express enforcement. A mapping does not install or run a checker.
