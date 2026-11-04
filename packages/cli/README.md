# Granary

**Ship context. Give coding agents the docs and source they need, right inside your repo.**

Granary brings versioned docs, source, and examples into a workspace as ordinary files, readable by any coding agent. This private package owns the maltty terminal adapter; `granary-ai` ships the public executable.

## Status

Use `granary init` to configure a consuming project and `granary create <directory>` to author a reusable pack around existing material. Both provide guided setup and non-interactive `--yes` scaffolding.

Run `granary validate --cwd path/to/pack` to validate a pack's `granary.json` through maltty's config loader.

See the [CLI reference](../../docs/reference/cli.md) for installation, restoration, update review, and standards commands. Run the local public executable from the repository root with `pnpm cli <command>`.
