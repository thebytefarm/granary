---
title: Code comments
description: 'Explain hidden constraints and required ordering without restating the surrounding code.'
---

# Code comments

Comment on the reason a future reader could miss.

<standard id="comments-rationale">

## Rationale

<why>

### Why

An ordering constraint can prevent data loss. Translating a function name into a sentence does not add useful context.

</why>

<rules>

### Rules

<rule id="omit-comments-that-paraphrase-identifiers-or-the-next-statement">

- <level>MUST</level> omit comments that paraphrase identifiers or the next statement. <enforcement>[review]</enforcement>

</rule>

<rule id="explain-a-workaround-lifecycle-constraint-safety-invariant-or-deliberate">

- <level>MAY</level> explain a workaround, lifecycle constraint, safety invariant, or deliberate compromise. <enforcement>[review]</enforcement>

</rule>

<rule id="attach-a-tracked-reference-to-unfinished-work">

- <level>MUST</level> attach a tracked reference to unfinished work. <enforcement>[review]</enforcement>

</rule>

<rule id="explain-the-reason-for-a-lint-suppression-wherever-its">

- <level>MUST</level> explain the reason for a lint suppression wherever its syntax allows it. <enforcement>[review]</enforcement>

</rule>

<rule id="preserve-tool-maintained-markers-and-required-license-notices">

- <level>MUST</level> preserve tool-maintained markers and required license notices. <enforcement>[review]</enforcement>

</rule>

<rule id="use-modules-and-declarations-instead-of-decorative-comment-banners">

- <level>MUST</level> use modules and declarations instead of decorative comment banners. <enforcement>[review]</enforcement>

</rule>

<rule id="follow-the-language-pack-s-public-documentation-conventions">

- <level>MUST</level> follow the language pack's public documentation conventions. <enforcement>[review]</enforcement>

</rule>

</rules>

<examples>

</examples>

<enforcement>

[review]

Review establishes whether comments add rationale. Formatters and configured documentation checks cover only their configured syntax.

</enforcement>

</standard>

## Enforcement

Review establishes whether comments add rationale. Formatters and configured documentation checks cover only their configured syntax.
