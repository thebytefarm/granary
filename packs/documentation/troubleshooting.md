---
title: Troubleshooting
description: 'Organize failures by recognizable symptoms, give a bounded fix, and show how to verify recovery.'
---

# Troubleshooting

A troubleshooting page starts from a symptom the reader can recognize. Its job is to return the reader to a working task safely.

<standard id="troubleshooting-failure-to-fix-mapping">

## Failure-to-fix mapping

<why>

### Why

An exact lock-drift message is easier to find than a heading called “installation problems.” A fix should preserve edited files instead of turning diagnosis into data loss.

</why>

<rules>

### Rules

<rule id="use-h2-issue-headings-that-work-as-direct-links">

- <level>MUST</level> use H2 issue headings that work as direct links. <enforcement>[review]</enforcement>

</rule>

<rule id="state-symptom-fix-and-verification-for-each-issue">

- <level>MUST</level> state Symptom, Fix, and Verification for each issue. <enforcement>[review]</enforcement>

</rule>

<rule id="include-the-exact-error-text-when-it-is-stable">

- <level>MUST</level> include the exact error text when it is stable and useful for searching. <enforcement>[review]</enforcement>

</rule>

<rule id="distinguish-changed-intent-changed-source-bytes-and-edited-destination">

- <level>MUST</level> distinguish changed intent, changed source bytes, and edited destination bytes. <enforcement>[review]</enforcement>

</rule>

<rule id="explain-prerequisites-or-data-effects-before-a-destructive-recovery">

- <level>MUST</level> explain prerequisites or data effects before a destructive recovery action. <enforcement>[review]</enforcement>

</rule>

<rule id="avoid-presenting-an-unsupported-command-as-a-fix">

- <level>MUST</level> avoid presenting an unsupported command as a fix. <enforcement>[review]</enforcement>

</rule>

<rule id="keep-causes-brief-and-link-conceptual-explanations-elsewhere">

- <level>SHOULD</level> keep causes brief and link conceptual explanations elsewhere. <enforcement>[review]</enforcement>

</rule>

<rule id="group-related-symptoms-without-hiding-them-behind-generic-headings">

- <level>SHOULD</level> group related symptoms without hiding them behind generic headings. <enforcement>[review]</enforcement>

</rule>

</rules>

<examples>

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

</examples>

<enforcement>

[review]

Component-content tests check standard metadata and heading structure. Review checks symptom/fix/verification labels and verifies that recovery preserves user-owned data and uses supported commands.

See [Runbooks](runbooks.md) for longer operating procedures and [References](references.md) for error contracts.

</enforcement>

</standard>

## Enforcement

Component-content tests check standard metadata and heading structure. Review checks symptom/fix/verification labels and verifies that recovery preserves user-owned data and uses supported commands.

See [Runbooks](runbooks.md) for longer operating procedures and [References](references.md) for error contracts.
