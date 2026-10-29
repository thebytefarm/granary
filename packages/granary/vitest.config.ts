import { fileURLToPath } from 'node:url'

import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: { '#/package.json': fileURLToPath(new URL('./package.json', import.meta.url)) },
  },
  test: { include: ['src/**/__tests__/**/*.test.ts'], exclude: ['**/*.network.test.ts'] },
})
