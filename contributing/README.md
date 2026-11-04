# Contributing

Before editing Granary, identify the behavior you intend to change and read the rules for that part of the CLI or library.

## Start here

1. Check root `AGENTS.md` for the repository's commands and permission boundaries.
2. Follow the standards links in `AGENTS.md` to the installed pages governing your change.
3. For installation or pack metadata work, read the [product concept](../docs/concepts/context-packs.md) and relevant references.
4. If indexed Markdown changed, regenerate the documentation regions.
5. Run validation and build from the root before handing the change back.

```sh
pnpm docs:index
pnpm validate
pnpm build
```

## CLI integration tests

Run the public distribution's suites after building:

```sh
pnpm build
pnpm --filter granary-ai test
```

`packages/granary/src/__tests__/` owns subprocess tests for help, version, validation, local/Git installation, reviewed updates, restoration, and standards exports. They run `granary-ai`'s built executable, not the private CLI entrypoint. The distribution test also packs `granary-ai`, installs the tarball into a disposable consumer with `pnpm install --prefer-offline`, and invokes `node_modules/.bin/granary`. It reuses the repository's pnpm workspace policy and prefers cached dependencies; a cold cache requires registry access for missing metadata or packages. The packed smoke includes native standards parsing to check dependency packaging.

`packages/cli/src/__tests__/` uses `maltty/test` for focused handler outcomes and argument routing against real local files. Its presentation logger is simulated; installation and filesystem behavior are not. These tests complement rather than replace the public executable suites.

To test actual upstream retrieval, run the separate network suite:

```sh
pnpm --filter granary-ai test:network
```

It builds first and installs the packed CLI through npm or pnpm. The suite covers `nextjs@16` shorthand, multiple pinned 15.x releases, and an exact release with custom output. It checks locked commits and hashes, byte-identical restoration in a fresh consumer, and protection for local edits. This installs Next.js reference material, not the Next.js runtime or an application. GitHub availability and Git transport can fail this test; ordinary `pnpm validate` excludes it.

## Standards as context

Granary provides independent packs from `packs/`, each with its own `granary.json`. `packs/granary.json` composes the three recommended sets; root `granary.json` consumes bundled TypeScript standards plus React documentation. The five installed shared/TypeScript components govern this repository. Rust and Python remain distribution material.

The installed files are generated context. Edit the authored component under `packs/`, then refresh deliberately; `install` restores a lock and rejects source drift rather than silently updating it.

### Dogfood the workspace CLI

Use `pnpm cli` in this repository rather than installing `granary-ai@latest` as a dependency on itself. The root script builds and runs the local public executable, so pack installation and review exercise unreleased changes. Root `granary.json` already adopts React docs and bundled TypeScript standards; do not run `init` over it. Avoid `pnpm --filter granary-ai exec granary`: it resolves the private CLI dependency's binary and reports its internal version rather than the public distribution version.

```sh
pnpm cli list
pnpm cli update
```

`update` prints a review without changing installed material. For a fresh-project setup smoke test, use `pnpm cli init --cwd <disposable-directory>`. Packed-consumer tests separately cover the installed distribution.

### Refresh authored context

Bundled standards are immutable snapshots, so editing an authored component does not change the root's installed snapshot. Test authored changes in a separate, existing disposable consumer:

```sh
pnpm cli add "$(pwd)/packs/typescript" --cwd /path/to/disposable-consumer
pnpm docs:index
pnpm validate
pnpm build
```

Do not rewrite an existing bundled snapshot to refresh it. Root installation restores the bundled version and pinned React source recorded in its lock; changing those selections requires an explicit reviewed update. Commit consumer configuration, locks, and agent links. Generated `.granary/` context and caches remain ignored.

## Documentation routing

The root `almanac.json` selects two documentation regions for `almanac-md` to maintain in `AGENTS.md`:

| Region              | Material                                                                 |
| ------------------- | ------------------------------------------------------------------------ |
| `<standards-index>` | Installed shared/TypeScript rules in `.context/docs/`                    |
| `<docs-index>`      | Root README, contributor guides, public docs, and package reference docs |

Edit the canonical Markdown page rather than the generated region. `pnpm docs:index` updates those regions and stages a changed target; it preserves the surrounding operating instructions and Turborepo block. Use `pnpm docs:index:check` for a read-only drift check. The full validation script includes that check.

This setup uses root `AGENTS.md` as the shared entrypoint, without compatibility links or installed Git hooks.

## Docs deployment

`.github/workflows/docs.yml` checks and builds the site on pull requests. Pushes to `main` and manual runs also deploy `.ciderpress/dist` to GitHub Pages. Package publication is separate.

The current site is <https://thebytefarm.github.io/granary/>. The workflow reads the deployment base from GitHub Pages; local builds default to `/`. Preview a project-path build with:

```sh
NODE_ENV=production CIDERPRESS_BASE=/granary/ pnpm docs:build
```

When switching between root and project-path builds locally, clear `node_modules/.cache/rspack` first. Ciderpress's `--clean` does not clear this cache, which can retain navigation from the previous base. CI builds start without it.

To connect a custom domain:

1. In repository Settings > Pages, set the custom domain you own. For a subdomain such as `docs.example.com`, add a Cloudflare CNAME record named `docs` pointing to `thebytefarm.github.io` (not a URL or `/granary/` path). Start with DNS-only mode. An apex domain requires the records in GitHub's linked custom-domain guide instead.
2. Rerun `CI: Docs` on `main`. Pages metadata supplies the new base automatically; no source-path edits are needed.
3. Wait for GitHub's DNS and certificate checks, enable Enforce HTTPS, and verify the home page, a nested route, and the farm assets on the new domain.

For rollback, revert the faulty docs commit through a pull request and redeploy. For a failed build or deployment, inspect the `CI: Docs` run and `github-pages` environment logs before changing settings. Do not bypass deployment protections. See [GitHub's custom-domain guide](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site) for DNS requirements and troubleshooting.

## Dependency proposals

Before asking to add or manually upgrade a dependency, identify the missing capability and inspect massaman and existing domain modules for overlap. For type helpers, evaluate TypeScript's built-in utilities, then type-fest; it is not currently installed.

Include current GitHub stars and the latest publication date in the proposal. Prefer at least 100 stars and a release within six months, and disclose exceptions. Bytefarm-maintained tools are exempt from the star threshold. Verify licensing, typing, ESM behavior, and supported runtimes. Obtain approval, resolve `@latest` unless a version was requested, and record a semver range and lockfile. Keep bundled private implementation packages outside the published runtime dependency set.

## Git workflow

Start feature branches from current `main` using `type/short-description`. Use `type(scope): description` with a lowercase imperative subject, preferably within 72 characters. Scopes name a package path (`packages/cli`, `packages/core`) or a cross-cutting area (`deps`, `ci`, `repo`). Mark breaking changes with `!` and explain them in a `BREAKING CHANGE:` footer.

PR titles follow the same convention; bodies include Summary, Changes, and Testing sections with related issues and exact verification results. Keep unfinished work as a draft and follow-up patches in the same PR. Use `gh` for GitHub operations. Merge only after required checks and review succeed, following the repository's merge policy.

Published behavior or API changes require a Changeset. Contributor-only docs and development-only tools may omit one. Publishing requires explicit authorization, completed validation/builds, and a version bump. Fix hook failures rather than bypassing them.

### Publish through GitHub Actions

`.github/workflows/publish.yml` runs Changesets on `main`: pending changesets create a version PR; prepared unpublished versions run validation, build, and publication. npm trusted publishing must authorize `thebytefarm/granary` with workflow filename `publish.yml` and no environment. Only `granary-ai` is public; the `@granary/*` workspaces remain private.

`publishWaitTimeout` gives npm up to ten minutes to expose the published version and serve its tarball. npm may accept an upload before scanning finishes. If availability times out, inspect the exact version in the registry before retrying; do not blindly upload the accepted version again.

### Publish locally

Start with a clean, committed checkout and pending changesets:

```sh
./publish.sh prepare
```

Review and commit the generated versions, changelogs, and lockfile. Then publish:

```sh
npm login
./publish.sh
```

The script asks for confirmation, checks npm authentication, and runs `pnpm release`, which validates and builds before Changesets publishes. Publishing requires a clean checkout with no unconsumed changesets. Changesets creates local release tags; the script never commits or pushes. Run `./publish.sh --help` for usage. Do not run `pnpm release` separately unless you intend to publish immediately.

## Code documentation

Use multiline JSDoc for exported functions; the installed `typescript-functional/0.1.0/comments.md` page covers outcomes, parameter constraints, examples, and private declarations. The verification toolchain is TypeScript 7's native `tsc`, oxlint, and oxfmt.

Label compatibility workarounds `HACK:` and correctness-sensitive caveats `NOTE:`. Attach a tracked reference to each `TODO` and `FIXME`.
