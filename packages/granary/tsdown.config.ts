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
  deps: { alwaysBundle: [/^@granary\//], neverBundle: ['marxml'] },
})
