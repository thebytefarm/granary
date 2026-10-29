import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: { include: ['src/__tests__/*.network.test.ts'], testTimeout: 300_000 },
})
