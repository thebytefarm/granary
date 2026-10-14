# Installation model

Granary installs selected reference material into a project-owned `.context/` directory.

## Definition, payload, and intent

A portable bundle describes existing files with `granary.json`. A curated definition uses `granary.pack.json` to describe selectable groups, their sources, and exact package-version mappings. The definition is distinct from the downloaded payload.

Root `granary.json` records named providers and consumer dependencies. Legacy `granary.config.json` remains readable. `granary-lock.json` records definition versions, selected content, exact Git commits, file hashes, and destinations. Package version, definition version, and upstream revision are separate identities.

## Versioned destinations

```text
.context/
  INDEX.md
  docs/
    bytefarm/engineering/0.1.0/
      README.md
  repos/
    bytefarm/react/19.2.0/
      ReactClient.js
```

Namespaced identities remain nested directories under any output override. `code` goes under `repos/`; these are selected source files, not retained Git checkouts. `docs` and `examples` use their own directories. One consumer entry per full identity is supported.

## Installation stages

1. Find definitions and match requested pack identities.
2. Choose content groups and explicit version mappings.
3. Read definition commits and selected upstream bytes.
4. Record source commits and content hashes.
5. Build payload, index, config, and lock changes.
6. Check all destinations before writing.
7. Apply file changes with recovery for ordinary I/O failures.

Retrieval failures do not write consumer files. Escaping paths and symlinks are rejected. Unmanaged files and edited managed files are preserved by failing the operation. Unrelated files are left in place.

Writes use adjacent temporary files and atomic rename per file. Recovery restores attempted writes on reported I/O failures; this is not a crash-safe, multi-file filesystem transaction. Concurrent installer runs are not supported.

## Restoration

`install` requires matching config and lock intent, then reads locked Git commits and verifies hashes. Local material must still match its locked bytes. A local hash detects drift but does not supply historical contents. Source updates are never substituted silently.

Each output root has a generated `INDEX.md` linking to selected entrypoints. Repository instructions can point at that index; Granary does not edit `AGENTS.md` automatically.
