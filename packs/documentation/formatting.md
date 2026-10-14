---
title: Formatting
description: 'Keep Markdown portable across copied packs, with concise metadata and examples readers can execute.'
---

# Formatting

Format each page so it still works when read as a local file or copied with the complete pack.

## Metadata and links

### Why

The same reference material is read by Almanac, the docs site, and a filesystem agent. Brief metadata and portable links let those readers use one source page.

### Rules

- MUST give standard pages matching frontmatter/H1 titles and a quoted description no longer than 120 characters.
- MAY leave README indexes without frontmatter.
- MUST link to sibling pack material with relative file paths while no site routes exist for it.
- MUST spell external references as complete URLs.
- MUST restrict metadata to facts about the page until an approved manifest contract defines other fields.
- MUST keep local-machine absolute paths and source-checkout-dependent links out of portable guidance.

## Content

### Why

A reader should know whether a fence contains a command, configuration, or source code. Concrete examples also reveal prerequisites that a shortened sketch can hide.

### Rules

- MUST label every fenced block with its language.
- MUST use specific values and include only the lines needed to demonstrate the rule.
- MUST present executable commands in fences and field or option mappings in tables.
- MUST finish normative bullets with a period.
- SHOULD keep punctuation consistent across the remaining list items.
- MUST provide complete runnable examples instead of placeholder omissions when direct execution is intended.
- MUST delegate document formatting to oxfmt.

See [Diagrams](diagrams.md) for visual models and directory trees.

## Enforcement

Granary's component-content tests check standard metadata and heading structure; oxfmt checks formatting. Installed-link tests establish local-link closure. Review checks portable meaning and executable examples.
