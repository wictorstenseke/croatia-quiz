import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/rules/**/*.test.ts'],
    // The emulator is a single shared instance; parallel files would collide.
    fileParallelism: false,
    testTimeout: 15000,
  },
})
