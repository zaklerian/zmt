import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  cacheDir: '../../node_modules/.vite/apps/preload',
  resolve: {
    alias: {
      '@zmt/contracts': path.resolve(import.meta.dirname, '../../libs/contracts/src/index.ts'),
    },
  },
  root: import.meta.dirname,
  test: {
    coverage: {
      exclude: ['src/main.ts', 'src/test-setup.ts', 'src/**/*.spec.ts'],
      include: ['src/**/*.ts'],
      provider: 'v8',
      reportsDirectory: '../../coverage/apps/preload',
      thresholds: { branches: 90, functions: 90, lines: 90, statements: 90 },
    },
    environment: 'node',
    globals: true,
    include: ['src/**/*.spec.ts'],
    name: 'preload',
    setupFiles: ['src/test-setup.ts'],
    watch: false,
  },
});
