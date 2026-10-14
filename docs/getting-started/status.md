# Project status

Local/Git installation, content selection, and pinned restoration are implemented in the workspace CLI.

| Surface                            | Status        | What you can use                                                            |
| ---------------------------------- | ------------- | --------------------------------------------------------------------------- |
| Pack manifest                      | Implemented   | Five required fields, strict validation, inferred TypeScript type           |
| `validate`                         | Implemented   | Load a manifest with maltty and report success/failure                      |
| Help, version, `about`             | Implemented   | Inspect and run the local CLI                                               |
| Core standards pack                | Available     | Read the checked-in files directly                                          |
| Docs site                          | Available     | Ciderpress site with reference, guides, and contributor standards           |
| `add`, `install`, `list`           | Implemented   | Local/Git installation, locked restoration, and listing                     |
| Curated definitions                | Implemented   | Named content groups and exact package-version mappings                     |
| Flat presets                       | Implemented   | Ordered exact-version sets, shared-member deduplication, pinned restoration |
| Recommended standards sets         | Available     | Seven components and TypeScript, Rust, and Python presets                   |
| Project configuration              | Implemented   | Portable source intent and relative destination overrides                   |
| Lockfile and installation index    | Implemented   | Exact commits, file hashes, and entrypoint navigation                       |
| Local and Git providers            | Implemented   | Selected file retrieval and integrity verification                          |
| `update`, `remove`, hosted catalog | Planned       | Not working commands or package-name selectors                              |
| S3, archives, URL/API providers    | Planned       | Transport contracts still need design                                       |
| Public SDK                         | Not published | Core schema is currently an internal workspace API                          |

## npm packages

`granary-ai` and `granary-md` are published name reservations at `0.0.1`. The workspace CLI is named `granary-ai` and exposes the `granary` executable. The current source has not replaced those placeholder releases.

## Reading examples

Implemented examples use the local workspace command. Proposed examples explicitly identify their status and describe the behavior to build. They are not promises of a released API.
