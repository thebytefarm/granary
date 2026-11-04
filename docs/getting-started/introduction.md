# Introduction

Granary brings the docs and source a coding agent needs into the repository where it works.

An API reference tells an agent what a method accepts. Source explains what it actually does. Examples show how to use it. A context pack keeps that material together, with an entry file that tells the agent where to start.

## A package manager for context

Choose a source, select packs, install them into the workspace, and record the resolution. The payload is reference material rather than executable dependencies.

A pack selects ordinary files through a [manifest](../reference/pack-manifest.md). It can contain Markdown, source files, examples, and project conventions. Granary's own [standards catalog](../packs/index.mdx) provides seven reusable components.

## Install Granary

Install the npm package with Node.js 26+ and Git available:

```sh
npm install --global granary-ai
granary add nextjs@16
```

The `granary-ai` package provides the `granary` command. Browse the [prebuilt packs](../packs/index.mdx), or see [CLI](../reference/cli.md) and [project config](../reference/project-config.md) for source selection and locked restoration.

## Where Granary fits

| Tool            | Main role                                                  |
| --------------- | ---------------------------------------------------------- |
| Package manager | Install executable dependencies                            |
| Skills          | Install reusable procedures and agent capabilities         |
| Context7        | Retrieve library reference material on demand              |
| Granary         | Package reference material and bring it into the workspace |

The agent continues using its existing file-reading and search tools. You control its selected material and the revisions the team installs.

Start with the [quick start](quick-start.md), then [create your own pack](../guides/create-pack.md).
