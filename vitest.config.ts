import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

export default defineConfig({
  resolve: {
    alias: {
      '@main': resolve(__dirname, 'src/main'),
      '@renderer': resolve(__dirname, 'src/renderer'),
    },
  },
  test: {
    globals: true,
    setupFiles: ['./test/setup.ts'],
    environmentMatchGlobs: [['src/renderer/**', 'jsdom']],
    poolMatchGlobs: [['src/main/**', 'vmForks']],
    exclude: ['node_modules/**', 'out/**', 'release/**', '.claude/**'],
    coverage: {
      provider: 'v8',
      include: [
        'src/main/storage/**',
        'src/renderer/services/**',
        'src/renderer/utils/**',
        'src/renderer/stores/**',
        'src/renderer/types/ipc.ts',
      ],
    },
  },
})
