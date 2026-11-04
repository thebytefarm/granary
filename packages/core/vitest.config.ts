import { fileURLToPath } from 'node:url'

import { defineConfig } from 'vitest/config'

export default defineConfig({
  // Each integration worker launches real Git processes and writes disposable workspaces.
  test: { maxWorkers: 2 },
  resolve: {
    alias: {
      '#/': fileURLToPath(new URL('./src/', import.meta.url)),
    },
  },
})
