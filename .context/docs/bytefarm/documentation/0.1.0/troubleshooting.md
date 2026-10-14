---
title: Troubleshooting
description: 'Organize failures by recognizable symptoms, give a bounded fix, and show how to verify recovery.'
---

# Troubleshooting

A troubleshooting page starts from a symptom the reader can recognize. Its job is to return the reader to a working task safely.

## Failure-to-fix mapping

### Why

An exact lock-drift message is easier to find than a heading called “installation problems.” A fix should preserve edited files instead of turning diagnosis into data loss.

### Rules

- MUST use H2 issue headings that work as direct links.
- MUST state Symptom, Fix, and Verification for each issue.
- MUST include the exact error text when it is stable and useful for searching.
- MUST distinguish changed intent, changed source bytes, and edited destination bytes.
- MUST explain prerequisites or data effects before a destructive recovery action.
- MUST avoid presenting an unsupported command as a fix.
- SHOULD keep causes brief and link conceptual explanations elsewhere.
- SHOULD group related symptoms without hiding them behind generic headings.

## Example issue

````md
## Pack already exists

**Symptom:** `add` reports that the pack already exists in project configuration.

**Fix:** Use the existing recorded installation; adding it again is not an update operation.

```sh
pnpm cli install
```

**Verification:** `pnpm cli list` still reports the original identity and selected groups.
````

## Enforcement

Component-content tests check standard metadata and heading structure. Review checks symptom/fix/verification labels and verifies that recovery preserves user-owned data and uses supported commands.

See [Runbooks](runbooks.md) for longer operating procedures and [References](references.md) for error contracts.
