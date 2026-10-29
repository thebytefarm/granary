import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: ['src/index.ts', 'src/schemas.ts', 'src/workspace.ts', 'src/packs.ts', 'src/updates.ts'],
  format: 'esm',
  fixedExtension: false,
  dts: true,
  clean: true,
})
