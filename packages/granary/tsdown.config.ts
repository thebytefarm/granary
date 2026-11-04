import { fileURLToPath } from 'node:url'

import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: [
    'src/index.ts',
    'src/core.ts',
    'src/plugins.ts',
    'src/standards.ts',
    'src/run.ts',
    'src/cli.ts',
  ],
  format: 'esm',
  fixedExtension: false,
  dts: true,
  clean: true,
  copy: {
    from: fileURLToPath(new URL('../core/builtins', import.meta.url)),
    to: fileURLToPath(new URL('./', import.meta.url)),
  },
  deps: { alwaysBundle: [/^@granary\//], neverBundle: ['marxml'] },
})
