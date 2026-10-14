# Curated pack definition

`granary.pack.json` describes upstream content rather than bundling the payload itself. It keeps pack identity, definition version, documented package version, and upstream revisions distinct.

| Field                  | Contract                                                           |
| ---------------------- | ------------------------------------------------------------------ |
| `name`                 | Portable pack identity, using the bundle's naming rules            |
| `version`              | Semantic version of this definition                                |
| `description`          | Nonempty description                                               |
| `groups`               | At least one of `docs`, `code`, or `examples`                      |
| `groups.<name>.source` | Local or Git source object                                         |
| `groups.<name>.root`   | Relative directory within the group source; default `.`            |
| `groups.<name>.entry`  | Relative entry file within that root                               |
| `groups.<name>.files`  | Nonempty positive file paths or glob patterns within that root     |
| `versions`             | Exact package versions mapped to per-group Git refs; default empty |

Unknown fields, traversal, invalid versions, and missing groups fail validation. Git-backed groups selected for a mapped package version require their own mapping. An unknown package version is rejected; package versions are never assumed to be Git tags. Without a package version, each group's declared source ref is used.

Local source paths in local definitions are relative to the definition directory. In Git-backed definitions, use local `path: "."` and a relative `root` for files in the definition repository. See [sources](sources.md).

## Checked-in React example

The checked-in `docs/examples/react/granary.pack.json` supplies docs and code from separate repositories:

- Docs: [reactjs/react.dev](https://github.com/reactjs/react.dev), commit `996ef72c1a9f7ecc003588a897be85fc647393c3`, dated October 2, 2025. This snapshot includes the React 19.2 release announcement. Its entry is `src/content/reference/react/index.md`.
- Code: [react/react](https://github.com/react/react), commit `ae74234eae6ebd62f19190731278e20bc1c37d51`, the commit referenced by the annotated `v19.2.0` tag. Its entry is `packages/react/src/ReactClient.js`.

Both entry paths and the docs release announcement were verified through GitHub at those commits. The code group is selected public implementation, not a complete buildable React checkout. The docs are a curated release-era snapshot, not an upstream versioned documentation artifact.

```sh
pnpm cli add ./docs/examples/react --package-version 19.2.0 --content docs code
```

There is no hosted catalog yet. Consumers point at a definition directory or a Git source containing definitions. Published snapshot/archive providers remain planned.
