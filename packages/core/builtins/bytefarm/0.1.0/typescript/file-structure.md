---
title: File structure
description: 'Assign modules to their owning capability and keep package entrypoints deliberate and shallow.'
---

# File structure

Choose a module's home from the behavior it owns and the callers that need it.

<standard id="file-structure-ownership-and-exports">

## Ownership and exports

<why>

### Why

An installer should not need terminal presentation code to inspect a source. Explicit entrypoints preserve that separation and reveal the supported package API.

</why>

<rules>

### Rules

<rule id="place-shared-code-in-the-narrowest-scope-that-contains">

- <level>MUST</level> place shared code in the narrowest scope that contains its callers. <enforcement>[review]</enforcement>

</rule>

<rule id="separate-reusable-domain-behavior-from-application-presentation-and-framework">

- <level>MUST</level> separate reusable domain behavior from application presentation and framework adapters. <enforcement>[review]</enforcement>

</rule>

<rule id="cross-a-package-boundary-using-its-workspace-name-and">

- <level>MUST</level> cross a package boundary using its workspace name and declared exports. <enforcement>[review]</enforcement>

</rule>

<rule id="enumerate-a-package-or-library-entrypoint-s-exports-by-name">

- <level>MUST</level> enumerate a package or library entrypoint's exports by name. <enforcement>[review]</enforcement>

</rule>

<rule id="avoid-wildcard-exports-and-chains-of-nested-barrel-modules">

- <level>MUST</level> avoid wildcard exports and chains of nested barrel modules. <enforcement>[review]</enforcement>

</rule>

<rule id="reference-sibling-implementation-files-directly-within-a-library-bypassing">

- <level>MUST</level> reference sibling implementation files directly within a library, bypassing its public entrypoint. <enforcement>[review]</enforcement>

</rule>

<rule id="export-named-declarations-unless-an-actual-tool-or-framework">

- <level>MUST</level> export named declarations unless an actual tool or framework contract requires a default. <enforcement>[review]</enforcement>

</rule>

<rule id="use-defaults-for-configuration-or-autoloaded-modules-when-the">

- <level>MAY</level> use defaults for configuration or autoloaded modules when the actual tool requires them. <enforcement>[review]</enforcement>

</rule>

<rule id="keep-manually-registered-commands-named-autoload-support-alone-does">

- <level>MUST</level> keep manually registered commands named; autoload support alone does not require a default. <enforcement>[review]</enforcement>

</rule>

<rule id="register-application-entrypoints-explicitly-unless-an-actual-autoload-contract">

- <level>MUST</level> register application entrypoints explicitly unless an actual autoload contract is in use. <enforcement>[review]</enforcement>

</rule>

</rules>

<examples>

</examples>

<enforcement>

[review]

Package exports and typechecks establish supported module resolution. Formatting covers configured import ordering; review checks owning capability and public surface.

</enforcement>

</standard>

<standard id="file-structure-file-organization">

## File organization

<why>

### Why

A consistent file layout lets a reviewer find the contract before reading private implementation details. Domain filenames make responsibility clearer than a miscellaneous helper bucket.

</why>

<rules>

### Rules

<rule id="separate-import-groups-in-this-order-node-builtins-external">

- <level>MUST</level> separate import groups in this order: Node builtins, external packages, workspace or path aliases, then relative files. <enforcement>[review]</enforcement>

</rule>

<rule id="spell-builtin-imports-with-node-and-type-only-imports-with">

- <level>MUST</level> spell builtin imports with `node:` and type-only imports with `import type`. <enforcement>[review]</enforcement>

</rule>

<rule id="use-workspace-names-or-configured-aliases-instead-of-deep">

- <level>MUST</level> use workspace names or configured aliases instead of deep relative paths across module boundaries. <enforcement>[review]</enforcement>

</rule>

<rule id="use-relative-paths-inside-a-module-and-for-its">

- <level>MAY</level> use relative paths inside a module and for its adjacent config or metadata. <enforcement>[review]</enforcement>

</rule>

<rule id="keep-exported-contract-types-near-their-functions-and-private">

- <level>MUST</level> keep exported contract types near their functions and private declarations below the public API. <enforcement>[review]</enforcement>

</rule>

<rule id="name-modules-for-their-responsibility-rather-than-introducing-a">

- <level>MUST</level> name modules for their responsibility rather than introducing a catch-all `helpers.ts`. <enforcement>[review]</enforcement>

</rule>

<rule id="delegate-formatting-and-configured-import-ordering-to-oxfmt">

- <level>SHOULD</level> delegate formatting and configured import ordering to oxfmt. <enforcement>[review]</enforcement>

</rule>

</rules>

<examples>

</examples>

<enforcement>

[review]

Package exports and typechecks establish supported module resolution. Formatting covers configured import ordering; review checks owning capability and public surface.

</enforcement>

</standard>

## Enforcement

Package exports and typechecks establish supported module resolution. Formatting covers configured import ordering; review checks owning capability and public surface.
