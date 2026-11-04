# Use Granary maintenance skills

Install the skill directories shipped with `granary-ai` so your coding agent can follow pack authoring and maintenance procedures.

These skills are for authored reusable packs, including local packs and curated pack definitions. They are not general workflows for arbitrary installed context, a framework docs recipe, or copied application code. A consumer `packs` entry, lock entry, or `.granary/context/` directory alone does not establish an authored pack. Confirm its source definition before using maintenance skills. Ordinary context keeps the CLI's restoration, review, and edit-protection behavior without requiring these skills.

## Prerequisites

Use Node.js 26+ and Git. Install the package in your project with `npm install --save-dev granary-ai` so its skill files are available locally. Your agent harness must support directory-based skills with a `SKILL.md` entrypoint. Choose its documented project-local skill directory before copying files.

## Install the skills

1. Verify the installed commands from your project root:

   ```sh
   npm exec -- granary standards --help
   npm exec -- granary update --help
   ```

2. Inspect `node_modules/granary-ai/skills/`. The npm package includes these directories:

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
