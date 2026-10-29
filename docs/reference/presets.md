# Presets

A recommended set is a pack containing other `packs`. Membership is recursive and explicit; directory discovery does not imply inclusion.

```json
{
  "name": "recommended-typescript",
  "packs": {
    "github:acme/standards/engineering": "v1",
    "github:acme/standards/typescript": "typescript/v1"
  }
}
```

Installing this pack includes both members and their declared members. Its own files are omitted unless `files` is supplied. Child destinations are namespaced beneath the selected parent destination. Cycles and conflicting destinations fail before writes. See [project configuration](project-config.md#unified-fields).

## Distributed sets and local adoption

Granary's `packs/granary.json` declares the recommended TypeScript, Rust, and Python sets. Each includes engineering, Git, documentation, agent instructions, and its language component.

The repository-root `granary.json` is a consumer, not the distribution catalog. It selects only the TypeScript set:

```json
{
  "name": "granary",
  "packs": {
    "file:packs#recommended-typescript": {
      "output": ".context/docs/bytefarm"
    }
  }
}
```

Another local project can select a set from a checkout with `file:../granary/packs#recommended-rust`. The name after `#` selects a declared member, not a filesystem directory. See [prebuilt packs](../packs/index.mdx) for the available sets.

## Locking and restoration

The lock records composition definitions separately from selected payloads. `install` verifies the recorded membership, source revisions, and file hashes without advancing upstream revisions. Changed local definitions fail restoration; `update` prepares a review of those changes.

Identical source selections at the same destination deduplicate. Different selections that claim the same destination fail before writes. Consumer edits remain separate from upstream hashes and require explicit decisions during reviewed updates.
