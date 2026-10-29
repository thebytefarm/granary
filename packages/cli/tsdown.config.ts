import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: ['src/index.ts', 'src/bin.ts'],
  format: 'esm',
  fixedExtension: false,
  dts: true,
  clean: true,
})
