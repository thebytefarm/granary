---
title: Formatting
description: 'Keep Markdown portable across copied packs, with concise metadata and examples readers can execute.'
---

# Formatting

Format each page so it still works when read as a local file or copied with the complete pack.

<standard id="formatting-metadata-and-links">

## Metadata and links

<why>

### Why

The same reference material is read by Almanac, the docs site, and a filesystem agent. Brief metadata and portable links let those readers use one source page.

</why>

<rules>

### Rules

<rule id="give-standard-pages-matching-frontmatter-h1-titles-and-a-quoted">

- <level>MUST</level> give standard pages matching frontmatter/H1 titles and a quoted description no longer than 120 characters. <enforcement>[review]</enforcement>

</rule>

<rule id="leave-readme-indexes-without-frontmatter">

- <level>MAY</level> leave README indexes without frontmatter. <enforcement>[review]</enforcement>

</rule>

<rule id="link-to-sibling-pack-material-with-relative-file-paths">

- <level>MUST</level> link to sibling pack material with relative file paths while no site routes exist for it. <enforcement>[review]</enforcement>

</rule>

<rule id="spell-external-references-as-complete-urls">

- <level>MUST</level> spell external references as complete URLs. <enforcement>[review]</enforcement>

</rule>

<rule id="restrict-metadata-to-facts-about-the-page-until-an">

- <level>MUST</level> restrict metadata to facts about the page until an approved manifest contract defines other fields. <enforcement>[review]</enforcement>

</rule>

<rule id="keep-local-machine-absolute-paths-and-source-checkout-dependent-links-out-of">

- <level>MUST</level> keep local-machine absolute paths and source-checkout-dependent links out of portable guidance. <enforcement>[review]</enforcement>

</rule>

</rules>

<examples>

</examples>

<enforcement>

[review]

Granary's component-content tests check standard metadata and heading structure; oxfmt checks formatting. Installed-link tests establish local-link closure. Review checks portable meaning and executable examples.

</enforcement>

</standard>

<standard id="formatting-content">

## Content

<why>

### Why

A reader should know whether a fence contains a command, configuration, or source code. Concrete examples also reveal prerequisites that a shortened sketch can hide.

</why>

<rules>

### Rules

<rule id="label-every-fenced-block-with-its-language">

- <level>MUST</level> label every fenced block with its language. <enforcement>[review]</enforcement>

</rule>

<rule id="use-specific-values-and-include-only-the-lines-needed">

- <level>MUST</level> use specific values and include only the lines needed to demonstrate the rule. <enforcement>[review]</enforcement>

</rule>

<rule id="present-executable-commands-in-fences-and-field-or-option">

- <level>MUST</level> present executable commands in fences and field or option mappings in tables. <enforcement>[review]</enforcement>

</rule>

<rule id="finish-normative-bullets-with-a-period">

- <level>MUST</level> finish normative bullets with a period. <enforcement>[review]</enforcement>

</rule>

<rule id="keep-punctuation-consistent-across-the-remaining-list-items">

- <level>SHOULD</level> keep punctuation consistent across the remaining list items. <enforcement>[review]</enforcement>

</rule>

<rule id="provide-complete-runnable-examples-instead-of-placeholder-omissions-when">

- <level>MUST</level> provide complete runnable examples instead of placeholder omissions when direct execution is intended. <enforcement>[review]</enforcement>

</rule>

<rule id="delegate-document-formatting-to-oxfmt">

- <level>MUST</level> delegate document formatting to oxfmt. <enforcement>[review]</enforcement>

</rule>

</rules>

<examples>

See [Diagrams](diagrams.md) for visual models and directory trees.

</examples>

<enforcement>

[review]

Granary's component-content tests check standard metadata and heading structure; oxfmt checks formatting. Installed-link tests establish local-link closure. Review checks portable meaning and executable examples.

</enforcement>

</standard>

## Enforcement

Granary's component-content tests check standard metadata and heading structure; oxfmt checks formatting. Installed-link tests establish local-link closure. Review checks portable meaning and executable examples.
