---
title: Diagrams
description: 'Show one relationship clearly using a small Mermaid diagram or a text tree for file layout.'
---

# Diagrams

Choose a visual model only when it explains a relationship more clearly than the surrounding text.

<standard id="diagrams-diagram-choice-and-appearance">

## Diagram choice and appearance

<why>

### Why

A content-source diagram and a directory tree answer different questions. Consistent colors and a small scope keep either view legible in a copied reference pack.

| Subject                 | Form             | Target limit                                       |
| ----------------------- | ---------------- | -------------------------------------------------- |
| Architecture or routing | Flowchart        | About 10–15 nodes                                  |
| Ordered interaction     | Sequence         | At most 7 participants and about 15–20 messages    |
| Data relationships      | ER               | About 8–10 entities with their relevant attributes |
| Files and directories   | Fenced text tree | The subtree needed for the explanation             |

</why>

<rules>

### Rules

<rule id="select-the-diagram-form-according-to-the-relationship-being">

- <level>MUST</level> select the diagram form according to the relationship being explained. <enforcement>[review]</enforcement>

</rule>

<rule id="apply-the-catppuccin-mocha-palette-to-mermaid-output">

- <level>MUST</level> apply the Catppuccin Mocha palette to Mermaid output. <enforcement>[review]</enforcement>

</rule>

<rule id="style-semantic-classes-such-as-source-core-and-storage">

- <level>MUST</level> style semantic classes such as `source`, `core`, and `storage`, rather than default classes or per-node overrides. <enforcement>[review]</enforcement>

</rule>

<rule id="shorten-labels-and-split-views-that-exceed-the-table-s">

- <level>MUST</level> shorten labels and split views that exceed the table's target sizes. <enforcement>[review]</enforcement>

</rule>

<rule id="explain-the-distinction-when-solid-and-dashed-connections-share">

- <level>MUST</level> explain the distinction when solid and dashed connections share a diagram. <enforcement>[review]</enforcement>

</rule>

<rule id="omit-activation-boxes-and-mirrored-actors-from-sequence-diagrams">

- <level>MUST</level> omit activation boxes and mirrored actors from sequence diagrams. <enforcement>[review]</enforcement>

</rule>

<rule id="use-verbs-to-describe-er-relationships">

- <level>MUST</level> use verbs to describe ER relationships. <enforcement>[review]</enforcement>

</rule>

<rule id="show-a-directory-layout-as-a-fenced-text-tree">

- <level>MAY</level> show a directory layout as a fenced text tree. <enforcement>[review]</enforcement>

</rule>

</rules>

<examples>

### Example

```mermaid
%%{init: {'theme': 'base', 'themeVariables': {'primaryColor': '#313244', 'primaryTextColor': '#cdd6f4', 'primaryBorderColor': '#6c7086', 'lineColor': '#89b4fa', 'background': '#1e1e2e'}}}%%
flowchart LR
    Definition["Definition"] --> Material["Selected files"]
    Material --> Navigation["Entrypoints"]
    classDef source fill:#313244,stroke:#f5c2e7,color:#cdd6f4
    classDef core fill:#313244,stroke:#89b4fa,color:#cdd6f4
    classDef storage fill:#45475a,stroke:#a6e3a1,color:#cdd6f4
    class Definition source
    class Material core
    class Navigation storage
```

</examples>

<enforcement>

[review]

Markdown formatting and installed-link tests cover their configured contracts. Rendered inspection and review establish diagram readability, palette, and semantic classes.

</enforcement>

</standard>

## Enforcement

Markdown formatting and installed-link tests cover their configured contracts. Rendered inspection and review establish diagram readability, palette, and semantic classes.
