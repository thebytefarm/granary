---
title: Writing
description: 'Assign every page a reader task and keep contributor rules separate from product explanation.'
---

# Writing

Start with the question the page answers. Put the answer ahead of the history behind it.

<standard id="writing-purpose-and-placement">

## Purpose and placement

<why>

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

</why>

<rules>

### Rules

<rule id="choose-the-table-s-location-and-page-shape-from-the">

- <level>MUST</level> choose the table's location and page shape from the reader's task. <enforcement>[review]</enforcement>

</rule>

<rule id="keep-each-authoritative-rule-in-its-owning-component-and">

- <level>MUST</level> keep each authoritative rule in its owning component and route readers to it wherever other pages need it. <enforcement>[review]</enforcement>

</rule>

<rule id="label-implemented-behavior-future-work-and-illustrative-examples-distinctly">

- <level>MUST</level> label implemented behavior, future work, and illustrative examples distinctly. <enforcement>[review]</enforcement>

</rule>

<rule id="keep-each-standards-section-on-one-topic-with">

- <level>MUST</level> keep each standards section on one topic with `### Why` and `### Rules` subsections. <enforcement>[review]</enforcement>

</rule>

<rule id="limit-the-rationale-to-one-or-two-concrete-sentences">

- <level>MUST</level> limit the rationale to one or two concrete sentences. <enforcement>[review]</enforcement>

</rule>

<rule id="use-uppercase-rfc-2119-terms-when-a-sentence-states">

- <level>MUST</level> use uppercase RFC 2119 terms when a sentence states a normative requirement. <enforcement>[review]</enforcement>

</rule>

<rule id="add-a-new-standard-to-the-pack-s-reading-index">

- <level>MUST</level> add a new standard to the pack's reading index. <enforcement>[review]</enforcement>

</rule>

<rule id="describe-generators-websites-index-synchronization-and-cli-capabilities-only">

- <level>MUST</level> describe generators, websites, index synchronization, and CLI capabilities only when they actually exist. <enforcement>[review]</enforcement>

</rule>

</rules>

<examples>

</examples>

<enforcement>

[review]

Granary's component-content tests check standard metadata and rationale/rules/enforcement headings. Review checks page purpose, canonical ownership, and concise normative language.

</enforcement>

</standard>

<standard id="writing-voice">

## Voice

<why>

### Why

Contributor guidance should tell a reader what to do on this repository. Promotional wording obscures that instruction.

</why>

<rules>

### Rules

<rule id="prefer-short-declarative-sentences-sentence-case-headings-and-names-of">

- <level>MUST</level> prefer short declarative sentences, sentence-case headings, and names of real operations or files. <enforcement>[review]</enforcement>

</rule>

<rule id="remove-filler-exaggerated-claims-corporate-comparisons-and-content-free-conclusions">

- <level>MUST</level> remove filler, exaggerated claims, corporate comparisons, and content-free conclusions. <enforcement>[review]</enforcement>

</rule>

<rule id="reserve-decorative-emojis-for-an-explicit-user-request">

- <level>MUST</level> reserve decorative emojis for an explicit user request. <enforcement>[review]</enforcement>

</rule>

<rule id="use-the-established-product-voice-in-the-root-readme">

- <level>MAY</level> use the established product voice in the root README while keeping standards prescriptive. <enforcement>[review]</enforcement>

</rule>

</rules>

<examples>

Use [Formatting](formatting.md) for metadata, links, fences, and punctuation.

</examples>

<enforcement>

[review]

Granary's component-content tests check standard metadata and rationale/rules/enforcement headings. Review checks page purpose, canonical ownership, and concise normative language.

</enforcement>

</standard>

## Enforcement

Granary's component-content tests check standard metadata and rationale/rules/enforcement headings. Review checks page purpose, canonical ownership, and concise normative language.
