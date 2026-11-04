---
title: Landing page first-pass review
description: 'Prioritized content and visualization findings from the current Granary landing page.'
---

# Landing page first-pass review

The approved farm hero is the strongest part of the page. Keep its direction. The next pass should make the product explanations as readable and concrete as the hero is recognizable.

## Scope and evidence

Reviewed all landing sections in `ciderpress.config.ts`, the three product SVGs, the hero component and styles, and the linked quick-start, pack catalog, CLI reference, and maintenance contracts. This is a landing-page review with checks of its main destinations, not a full audit of every documentation page.

Browser layout checks used desktop and 390px mobile viewports. At desktop, split-section illustrations rendered about 533px wide; at mobile, 322px. No page-level horizontal overflow appeared at those sizes. Scrolled screenshot capture was unreliable, so diagram legibility findings use rendered dimensions and authored font sizes rather than screenshots alone.

## Fixed in this pass

- **Alpha visibility:** the hero badge now uses an opaque amber background, dark text, a pale border, and a heavier font. The old dark-on-dark treatment disappeared into the scene.
- **Diagram framing:** all three product visuals now omit outer panels, visible titles, and footer strips. The reviewed-update visual also omits its terminal banner.

## 1. Product diagrams are too small to read

**Follow-up:** the code-only replacement was rejected. The installation SVG remains in a left/right split, with 16px source body text, a slightly wider visual column, and a shortened Next.js selection with consistent JSON indentation. Smaller screens retain the stacked layout. The source-flow diagram uses Granary’s icon instead of the house. The reviewed-update diagram retains its three versions, with larger labels and individual decision nodes. Mobile label readability remains open. The findings below describe the original baseline, not the current implementation.

**Priority: high.** All three SVGs use a 760px-wide desktop canvas with 10–15px labels. At the measured widths, 10–12px source labels become approximately 7–8px on desktop and 4–5px on mobile. Vector sharpness does not make tiny text readable.

Affected assets:

- `.github/assets/context-workspace.svg`.
- `.github/assets/context-sources.svg`.
- `.github/assets/context-review.svg`.

**Recommended next change:** keep only the conceptual relationship in the illustration. Render commands, paths, and substantive labels as responsive HTML with selectable text. Stack the steps on mobile instead of shrinking a desktop diagram. Aim for ordinary body-sized labels, not image footnotes.

Do not solve this by giving the existing SVG a larger minimum width and forcing horizontal scrolling. Essential information should fit the page.

## 2. The installation picture mixes two different examples

**Priority: high.** `context-workspace.svg` shows a manifest pinned to `v16.0.0`, but its command is `pnpm cli add nextjs@16`. The quick start resolves that recipe to a supported stable tag; it does not promise `v16.0.0` specifically.

The image also compresses a manifest, a file tree, a command, and an agent entrypoint into one small panel.

**Recommended next change:** show one consistent journey: `add nextjs@16`, a clearly illustrative resolved revision, and the resulting index. Put the command in a real copyable code block. Move the full manifest into the workflow example, where readers can inspect it.

## 3. The update illustration does not demonstrate a decision

**Priority: high.** `context-review.svg` labels baseline, local, and incoming columns, but its gray bars and unrelated added sentences do not show what changed in one file. The decision labels look like controls, although the illustration is static. It also omits the apply step.

**Recommended next change:** use a small, consistent example file across all three versions. Explain one retained customization and one incoming change, then show the resulting file. Explicitly identify this as an illustration of a JSON review workflow; Granary does not ship the depicted interactive merge interface.

Keep the distinction between preparing a review and applying it. The maintenance contract already explains it accurately in `docs/concepts/pack-maintenance.md`.

## 4. Too many sections repeat the same explanation

**Priority: medium.** The first split, the source-flow split, and the three-step tabs all explain sources becoming local files plus an index. The six feature cards repeat several of those points before the visitor reaches the full workflow. The result is a long page without much new evidence between sections.

**Recommended next change, requiring layout approval:** lead with one real command and its result, keep the source-flow explanation compact, and use the tabs only for details that have not already appeared. Preserve the reviewed-update section because it explains a distinct capability.

The page should answer, in order: what does this install, how do I try it, how does my agent use it, and what happens when the source changes?

## 5. The hero is attractive but still abstract about the product

**Priority: medium.** “Give your agent better context” and “Your stack has a version” do not immediately say that Granary installs reference files. The primary action also uses a metaphor before the reader knows what a pack is.

**Recommended copy for review:** “Install versioned docs, source, and examples in your repo. Your coding agent reads the files with its existing tools. Lock the selection and restore it with your project.”

Consider “Try the quick start” for the primary action. Keep the farm personality in the art and selected headings rather than making every instruction agricultural.

No hero headline or tagline rewrite was applied in this pass.

## 6. Alpha availability and pack discovery need clearer expectations

**Priority: medium.** The quick start correctly requires a checkout, Node.js 26+, pnpm, and Git. Those requirements are not apparent until after the landing-page CTA. The final phrase “workspace preview” does not clearly mean “run the CLI from this checkout.”

The pack catalog also says to use the workspace CLI but presents a bare `granary add` command without explaining how that executable becomes available. The README has a directly usable workspace example that would be a better starting point.

**Recommended next change:** add a short checkout-required note near the first runnable example. Make catalog installation commands use the same execution model as the quick start. Avoid suggesting that the published placeholder package provides the current workflow.

## 7. Source flow and language cards need more useful destinations

**Priority: medium.** The source-flow picture gets the overall relationship right, but “Source” appears beside Git and Local as if it were another transport. Source code is content; Git and local folders are transports. The barn icon also adds metaphor where a folder/index relationship would be clearer.

The TypeScript/Rust/Python cards are intentionally text-only and separately framed. Keep that approved treatment. Their generic “Learn more” tails could be more specific, and the section needs to make clear these are opinionated functional standards sets, not complete language or framework references.

**Recommended next change:** label the flow by transport and content consistently. Use explicit language-pack link text where the component supports it. Keep additional artwork out of these cards.

## Suggested next pass

The approved reorganization removes the six-card capabilities grid from the page. A compact select/install/agent summary and one quick-start button sit beneath the installation diagram, replacing the rejected workflow tabs. Source flow, reviewed updates, recommended language sets, and the wheat-field CTA follow. The open-column and linked-row language treatments were rejected; the original separate dark cards are restored. All three diagrams and the farm artwork remain.

The removed grid and previous language-card surface settings are preserved in [the layout archive](../.github/assets/landing-layout-archive.json). Assets remain available for reuse; cleanup is a separate end-of-work decision. The findings above record the first-pass baseline rather than a fresh audit of the reorganized page.
