---
title: File structure
description: 'Keep Python domain modules independent of presentation, runtime wiring, and resource adapters.'
---

# File structure

Place behavior in the smallest module that owns its callers and contract.

<standard id="file-structure-module-boundaries">

## Module boundaries

<why>

### Why

Importing a domain module should not initialize a client or execute a command.

</why>

<rules>

### Rules

<rule id="separate-pure-domain-transformations-resource-adapters-and-application-entrypoints">

- <level>MUST</level> separate pure domain transformations, resource adapters, and application entrypoints. <enforcement>[review]</enforcement>

</rule>

<rule id="avoid-import-time-i-o-and-mutable-application-globals">

- <level>MUST</level> avoid import-time I/O and mutable application globals. <enforcement>[review]</enforcement>

</rule>

<rule id="use-explicit-imports-and-avoid-wildcard-re-export-chains">

- <level>MUST</level> use explicit imports and avoid wildcard re-export chains. <enforcement>[review]</enforcement>

</rule>

<rule id="keep-init-py-focused-on-a-deliberate-public-surface">

- <level>MUST</level> keep `__init__.py` focused on a deliberate public surface. <enforcement>[review]</enforcement>

</rule>

<rule id="keep-executable-entrypoints-thin-and-coordinate-effects-there">

- <level>MUST</level> keep executable entrypoints thin and coordinate effects there. <enforcement>[review]</enforcement>

</rule>

<rule id="place-tests-beside-their-capability-or-in-a-corresponding">

- <level>MUST</level> place tests beside their capability or in a corresponding test directory. <enforcement>[review]</enforcement>

</rule>

<rule id="use-the-consumer-s-established-package-and-environment-layout">

- <level>MUST</level> use the consumer's established package and environment layout. <enforcement>[review]</enforcement>

</rule>

</rules>

<examples>

</examples>

<enforcement>

[review]

Import tests expose initialization effects. Lint and typechecks cover configured imports; review establishes module ownership.

</enforcement>

</standard>

## Enforcement

Import tests expose initialization effects. Lint and typechecks cover configured imports; review establishes module ownership.
