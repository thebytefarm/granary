---
title: Dependencies
description: 'Evaluate capability, typing, maintenance, and licensing before expanding the dependency vocabulary.'
---

# Dependencies

Use the language's native capabilities and the installed toolkit before adding another library.

<standard id="dependencies-selection">

## Selection

<why>

### Why

Two overlapping libraries create two contracts to maintain. A dependency should fill a demonstrated gap.

</why>

<rules>

### Rules

<rule id="identify-the-capability-missing-from-native-apis-and-existing">

- <level>MUST</level> identify the capability missing from native APIs and existing dependencies. <enforcement>[review]</enforcement>

</rule>

<rule id="inspect-current-upstream-documentation-licensing-supported-runtimes-and-typing">

- <level>MUST</level> inspect current upstream documentation, licensing, supported runtimes, and typing support. <enforcement>[review]</enforcement>

</rule>

<rule id="record-maintenance-evidence-including-the-latest-release-date-and">

- <level>MUST</level> record maintenance evidence, including the latest release date and known limitations. <enforcement>[review]</enforcement>

</rule>

<rule id="obtain-any-approval-required-by-the-consuming-repository-s-operating">

- <level>MUST</level> obtain any approval required by the consuming repository's operating instructions. <enforcement>[review]</enforcement>

</rule>

<rule id="resolve-the-current-release-at-installation-time-unless-a">

- <level>MUST</level> resolve the current release at installation time unless a specific version is requested. <enforcement>[review]</enforcement>

</rule>

<rule id="record-a-reproducible-version-and-lock-resolution">

- <level>MUST</level> record a reproducible version and lock resolution. <enforcement>[review]</enforcement>

</rule>

<rule id="distinguish-a-pack-s-library-recommendation-from-permission-to-install">

- <level>MUST</level> distinguish a pack's library recommendation from permission to install it. <enforcement>[review]</enforcement>

</rule>

<rule id="prefer-one-vocabulary-for-a-capability-over-overlapping-general-purpose">

- <level>SHOULD</level> prefer one vocabulary for a capability over overlapping general-purpose toolkits. <enforcement>[review]</enforcement>

</rule>

</rules>

<examples>

</examples>

<enforcement>

[review]

Lockfiles establish reproducible resolutions. Review checks selection evidence and the consumer's approval requirements.

</enforcement>

</standard>

## Enforcement

Lockfiles establish reproducible resolutions. Review checks selection evidence and the consumer's approval requirements.
