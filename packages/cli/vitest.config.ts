import { fileURLToPath } from 'node:url'

import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: {
      '#packs/': fileURLToPath(new URL('../../packs/', import.meta.url)),
      '#/package.json': fileURLToPath(new URL('./package.json', import.meta.url)),
      '#/': fileURLToPath(new URL('./src/', import.meta.url)),
    },
  },
})
