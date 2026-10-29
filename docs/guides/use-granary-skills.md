# Use Granary maintenance skills

Install the skill directories shipped with `granary-ai` so your coding agent can follow pack authoring and maintenance procedures.

## Prerequisites

Build the workspace CLI with Node.js 26+ and `pnpm build` from the Granary checkout root; the current contract is not published yet. Your agent harness must support directory-based skills with a `SKILL.md` entrypoint. Choose its documented project-local skill directory before copying files.

## Install the skills

1. Verify the built commands from the checkout root:

   ```sh
   pnpm cli standards --help
   pnpm cli update --help
   ```

2. Inspect `packages/granary/skills/` in the checkout. The packed convenience package includes the same directories beneath `granary-ai/skills/`:

   | Directory                     | Procedure                                                         |
   | ----------------------------- | ----------------------------------------------------------------- |
   | `granary-author-pack`         | Author metadata and complete standards; validate and inspect JSON |
   | `granary-customize-pack`      | Edit local guidance while preserving upstream provenance          |
   | `granary-review-update`       | Walk through a three-way preview and record review decisions      |
   | `granary-contribute-upstream` | Prepare a focused reusable contribution from local changes        |

3. Copy the desired directories into your harness's skill directory. Copy each directory intact, including `SKILL.md`; do not overwrite an existing customized skill without reviewing its differences. In this source repository the same directories live under `packages/granary/skills/`.

4. Refresh your harness's skill discovery, then ask it to author a Granary pack or review an upstream update. Confirm it discovers the corresponding skill and uses `granary standards` or `granary update` as instructed.

## Expected result

The agent discovers the selected procedures. Installing a context pack alone does not register these skills, and the CLI does not choose a harness-specific installation location.

The update skill produces a review of baseline, local, and incoming content, then applies authorized decisions with `granary update --apply`. Accepted local results are recorded separately from upstream hashes for restoration; later unaccepted edits are still protected.

## Troubleshooting

If discovery fails, check that the harness sees `<skill-directory>/<skill-name>/SKILL.md` rather than a loose Markdown file or an extra nested directory. Refresh discovery and request the named skill again.

If an update preview reports an unavailable baseline, preserve the current local files and recover the exact locked source or retained cache before retrying. Do not substitute current upstream bytes for the accepted baseline. See [pack maintenance](../concepts/pack-maintenance.md).
