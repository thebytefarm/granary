# Separate upstream sources

A curated `granary.json` composes selected material from other repositories. It uses the same manifest contract as a portable pack or consumer project; there is no separate definition format.

The checked-in `docs/examples/react/granary.json` selects React documentation and implementation from independent sources:

```json
{
  "name": "bytefarm/react",
  "packs": {
    "docs": {
      "source": "github:reactjs/react.dev",
      "commit": "996ef72c1a9f7ecc003588a897be85fc647393c3",
      "files": { "include": ["src/content/**/*.md"] },
      "output": "docs"
    },
    "code": {
      "source": "github:react/react",
      "commit": "ae74234eae6ebd62f19190731278e20bc1c37d51",
      "files": { "include": ["packages/react/src/**/*.js"] },
      "output": "code"
    }
  }
}
```

Each member owns its source, exact revision, selection, and destination. Selection retains source-relative paths, so docs appear beneath `docs/src/content/` and code beneath `code/packages/react/src/`. No package-version lookup or implicit Git tag derivation occurs.

## Install and inspect

From a Granary source checkout with the workspace CLI built:

```sh
pnpm cli add ./docs/examples/react --list
```

To adopt it into a separate project, run the workspace executable from that project with a local source locator pointing to this directory. Select `#docs` or `#code` to adopt only that declared member; omit the suffix to include both.

The example pins existing upstream commits but does not claim to reproduce an npm release byte-for-byte. Review attribution and license obligations before redistributing upstream files.

## Errors and limitations

An unavailable repository or commit fails source resolution. Missing selected files, unsafe paths, and destination conflicts fail before writes. Preparation never runs upstream code. Website crawling and automatic framework-version catalogs remain future work.

See [pack manifests](pack-manifest.md), [sources](sources.md), and [project configuration](project-config.md) for the shared contract.
