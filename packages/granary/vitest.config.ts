import { fileURLToPath } from 'node:url'

import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: { '#/package.json': fileURLToPath(new URL('./package.json', import.meta.url)) },
  },
  test: {
    // Packed consumers and CLI subprocesses compete with the core integration suite.
    maxWorkers: 2,
    include: ['src/**/__tests__/**/*.test.ts'],
    exclude: ['**/*.network.test.ts'],
  },
})
