# Introduction

Granary brings the docs and source a coding agent needs into the repository where it works.

An API reference tells an agent what a method accepts. Source explains what it actually does. Examples show how to use it. A context pack keeps that material together, with an entry file that tells the agent where to start.

## A package manager for context

The intended workflow is familiar: choose a source, select packs, install them into the workspace, and record the resolution. The payload is reference material rather than executable dependencies.

A pack selects ordinary files through a [manifest](../reference/pack-manifest.md). It can contain Markdown, source files, examples, and project conventions. Granary's own [standards catalog](../../packs/README.md) provides seven reusable components.

## Start with what works today

You can author and validate bundles, install local or Git-backed packs, choose content groups, and restore pinned material with any coding agent.

```sh
pnpm cli validate
```

Multi-pack installation, Git retrieval, lockfiles, and generated indexes work in the workspace CLI. See [CLI](../reference/cli.md), [project config](../reference/project-config.md), and [project status](status.md).

## Where Granary fits

| Tool            | Main role                                                  |
| --------------- | ---------------------------------------------------------- |
| Package manager | Install executable dependencies                            |
| Skills          | Install reusable procedures and agent capabilities         |
| Context7        | Retrieve library reference material on demand              |
| Granary         | Package reference material and bring it into the workspace |

The agent continues using its existing file-reading and search tools. You control its selected material and the revisions the team installs.

Start with the [quick start](quick-start.md), then [create your own pack](../guides/create-pack.md).
