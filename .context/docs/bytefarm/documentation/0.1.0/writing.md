---
title: Writing
description: 'Assign every page a reader task and keep contributor rules separate from product explanation.'
---

# Writing

Start with the question the page answers. Put the answer ahead of the history behind it.

## Purpose and placement

### Why

A contributor changing file selection needs a contract, while a new user needs an installation guide. Keeping those purposes distinct prevents a product page from becoming a second standards source.

| Purpose                    | Home                       | Shape                                                         |
| -------------------------- | -------------------------- | ------------------------------------------------------------- |
| Product pitch and status   | Root README                | Value, working capabilities, and a development starting point |
| Engineering rules          | Owning standards component | Topic, rationale, normative rules, and a useful example       |
| Contributor task           | `contributing/guides/`     | Prerequisites, numbered steps, and a verification result      |
| Product explanation        | `docs/concepts/`           | Purpose, design reasoning, and decided or open behavior       |
| Package-specific reference | Owning package's `docs/`   | Caller-facing contracts, fields, and outcomes                 |
| Disposable planning        | Gitignored `.scratchpad/`  | Notes limited to the current task                             |

### Rules

- MUST choose the table's location and page shape from the reader's task.
- MUST keep each authoritative rule in its owning component and route readers to it wherever other pages need it.
- MUST label implemented behavior, future work, and illustrative examples distinctly.
- MUST keep each standards section on one topic with `### Why` and `### Rules` subsections.
- MUST limit the rationale to one or two concrete sentences.
- MUST use uppercase RFC 2119 terms when a sentence states a normative requirement.
- MUST add a new standard to the pack's reading index.
- MUST describe generators, websites, index synchronization, and CLI capabilities only when they actually exist.

## Voice

### Why

Contributor guidance should tell a reader what to do on this repository. Promotional wording obscures that instruction.

### Rules

- MUST prefer short declarative sentences, sentence-case headings, and names of real operations or files.
- MUST remove filler, exaggerated claims, corporate comparisons, and content-free conclusions.
- MUST reserve decorative emojis for an explicit user request.
- MAY use the established product voice in the root README while keeping standards prescriptive.

Use [Formatting](formatting.md) for metadata, links, fences, and punctuation.

## Enforcement

Granary's component-content tests check standard metadata and rationale/rules/enforcement headings. Review checks page purpose, canonical ownership, and concise normative language.
