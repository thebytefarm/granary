---
'granary-ai': patch
---

Separate base and standards client composition, move plugin and workspace ownership into their capabilities, and consolidate filesystem and bounded subprocess access. Remove the CLI command-client wrapper, standalone diff command, and legacy CLI selector flags; commands use SDK capabilities directly.

Route pack adoption and restoration through prepared installation transactions with stale-state checks and rollback. Read only the current manifest contract for SDK discovery and authored standards, remove legacy update preparation and comparison APIs, and validate pending enforcement settings during reviewed updates.

Separate the distributed recommended sets in packs/granary.json from the repository's TypeScript-only consumer manifest and refresh its locked installation without changing existing context paths.

Remove obsolete catalog, flat-preset, version-mapping, and historical manifest contracts. Record recursive membership as composition provenance, reject tampered lock edges, preserve edited shared components when adding sets, and require reviewed updates for changed shared upstream bytes. Route capture, restoration, and reviewed transaction planning through the installation client. Keep standards interpretation separate from byte installation and restoration, with reviewed standards validation owned by the standards capability.

Use shared provider-based source and revision schemas across the SDK and transports rather than translating to kind/ref objects. Keep ambiguous manifest revision shorthand intact until Git resolution, and represent pinned content origins with explicit commit selectors. Make low-level filesystem helpers private and route writes and rollback through checked, workspace-bound operations.

Consolidate installation payload/index planning and snapshot/customization handling into their owning modules. Remove the shared root error module in favor of installation, source, standards, and filesystem-owned failures.
