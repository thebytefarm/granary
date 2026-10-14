---
title: Code comments
description: 'Explain hidden constraints and required ordering without restating the surrounding code.'
---

# Code comments

Comment on the reason a future reader could miss.

## Rationale

### Why

An ordering constraint can prevent data loss. Translating a function name into a sentence does not add useful context.

### Rules

- MUST omit comments that paraphrase identifiers or the next statement.
- MAY explain a workaround, lifecycle constraint, safety invariant, or deliberate compromise.
- MUST attach a tracked reference to unfinished work.
- MUST explain the reason for a lint suppression wherever its syntax allows it.
- MUST preserve tool-maintained markers and required license notices.
- MUST use modules and declarations instead of decorative comment banners.
- MUST follow the language pack's public documentation conventions.

## Enforcement

Review establishes whether comments add rationale. Formatters and configured documentation checks cover only their configured syntax.
