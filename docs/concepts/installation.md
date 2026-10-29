# Installation model

Granary installs selected reference material into consumer-owned paths, defaulting to `.granary/context/`.

## Definition, payload, and intent

A portable pack describes existing files with `granary.json`. A curated pack composes sources under `packs` in that same format. Consumers can also select material from a repository without a manifest.

The consumer's `granary.json` selects only material that project needs. Distribution manifests can live separately: this repository consumes TypeScript in its root manifest and declares all language sets in `packs/granary.json`. The lock retains composition provenance, exact commits, selected files, hashes, and destinations.

## Versioned destinations

```text
granary.json
granary-lock.json
.granary/
  .gitignore
  context/
    INDEX.md
    github/vercel/next.js/v15.5.0/
      docs/
  cache/
    baselines/
```

Explicit member output adopts content directly beneath that destination; root output supplies its base. Without overrides, source locators and requested revisions namespace destinations. Code is ordinary selected content, not forced into a separate hidden tree. Arrays support independent revisions of one source.

Configuration and lockfiles stay at the project root regardless of output overrides. Granary writes `.granary/.gitignore` containing `*` to ignore generated context and the shared baseline cache without editing the root `.gitignore`. Explicit destinations outside `.granary/` are not automatically ignored. Existing differing ignore files fail preflight rather than being overwritten.

## Installation stages

1. Read current manifest intent and expand declared members.
2. Resolve source revisions and selected files.
3. Read definition commits and selected upstream bytes.
4. Record source commits and content hashes.
5. Build payload, index, config, and lock changes.
6. Check all destinations before writing.
7. Recheck observed destination bytes and apply changes with rollback on reported failure.

Retrieval failures do not write consumer files. Escaping paths and symlinks are rejected. Unmanaged files and edited managed files are preserved by failing the operation. Unrelated files are left in place.

Writes use adjacent temporary files and atomic rename per file. Recovery restores attempted writes on reported I/O failures; this is not a crash-safe, multi-file filesystem transaction. Concurrent installer runs are not supported.

## Restoration

`install` requires matching config and lock intent, verifies ordered composition membership, then reads pinned Git commits and checks hashes. Local upstream material must still match locked bytes. Source updates are never substituted silently.

Reviewed updates can record accepted local additions, edits, and deletions separately from upstream hashes. `install` validates and overlays those materialized results, restores missing accepted files, and rejects later unaccepted edits. See [pack maintenance](pack-maintenance.md) for review decisions, baseline recovery, and restoration limits.

Each output root has a generated `INDEX.md` linking to selected entrypoints. Repository instructions can point at that index; Granary does not edit `AGENTS.md` automatically.
