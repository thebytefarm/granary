#!/usr/bin/env node
import { run } from '@granary/cli'
import packageJson from '#/package.json' with { type: 'json' }

await run({ version: packageJson.version })
