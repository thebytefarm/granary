---
title: Pull requests
description: 'Keep reviews scoped, verification evidence accurate, and follow-up discussion continuous.'
---

# Pull requests

Give a reviewer one coherent change and enough evidence to assess it.

## Review contract

### Why

Continuing a change in its existing review preserves the relationship between feedback and fixes.

### Rules

- MUST describe the change, its reason, and the affected contracts.
- MUST include a testing section with exact commands and observed outcomes.
- MUST identify checks that were unavailable or not run.
- MUST review the complete diff before requesting review.
- MUST mark unfinished work as a draft.
- MUST keep follow-up work for the same change in the existing review.
- MUST use URLs returned by the hosting tool rather than invent them.
- MUST follow the consumer's merge, publishing, and history-rewrite policy.

## Enforcement

Required checks and hosting protections enforce configured gates. Review establishes scope and the accuracy of verification claims.
