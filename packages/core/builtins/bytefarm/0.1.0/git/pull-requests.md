---
title: Pull requests
description: 'Keep reviews scoped, verification evidence accurate, and follow-up discussion continuous.'
---

# Pull requests

Give a reviewer one coherent change and enough evidence to assess it.

<standard id="pull-requests-review-contract">

## Review contract

<why>

### Why

Continuing a change in its existing review preserves the relationship between feedback and fixes.

</why>

<rules>

### Rules

<rule id="describe-the-change-its-reason-and-the-affected-contracts">

- <level>MUST</level> describe the change, its reason, and the affected contracts. <enforcement>[review]</enforcement>

</rule>

<rule id="include-a-testing-section-with-exact-commands-and-observed">

- <level>MUST</level> include a testing section with exact commands and observed outcomes. <enforcement>[review]</enforcement>

</rule>

<rule id="identify-checks-that-were-unavailable-or-not-run">

- <level>MUST</level> identify checks that were unavailable or not run. <enforcement>[review]</enforcement>

</rule>

<rule id="review-the-complete-diff-before-requesting-review">

- <level>MUST</level> review the complete diff before requesting review. <enforcement>[review]</enforcement>

</rule>

<rule id="mark-unfinished-work-as-a-draft">

- <level>MUST</level> mark unfinished work as a draft. <enforcement>[review]</enforcement>

</rule>

<rule id="keep-follow-up-work-for-the-same-change-in-the">

- <level>MUST</level> keep follow-up work for the same change in the existing review. <enforcement>[review]</enforcement>

</rule>

<rule id="use-urls-returned-by-the-hosting-tool-rather-than">

- <level>MUST</level> use URLs returned by the hosting tool rather than invent them. <enforcement>[review]</enforcement>

</rule>

<rule id="follow-the-consumer-s-merge-publishing-and-history-rewrite-policy">

- <level>MUST</level> follow the consumer's merge, publishing, and history-rewrite policy. <enforcement>[review]</enforcement>

</rule>

</rules>

<examples>

</examples>

<enforcement>

[review]

Required checks and hosting protections enforce configured gates. Review establishes scope and the accuracy of verification claims.

</enforcement>

</standard>

## Enforcement

Required checks and hosting protections enforce configured gates. Review establishes scope and the accuracy of verification claims.
