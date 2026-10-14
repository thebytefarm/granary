#!/usr/bin/env node
import { cli } from 'maltty'

import packageJson from '../package.json' with { type: 'json' }
import about from './commands/about.js'
import { add } from './commands/add.js'
import { install } from './commands/install.js'
import { list } from './commands/list.js'
import { validate } from './commands/validate.js'

await cli({
  name: 'granary',
  version: packageJson.version,
  description: 'Ship context. Give coding agents local docs and source.',
  commands: { about, validate, add, install, list },
})
