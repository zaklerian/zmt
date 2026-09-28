import { defineConfig } from 'vitest/config';

export default defineConfig({
  cacheDir: '../../node_modules/.vite/libs/contracts',
  root: import.meta.dirname,
  test: {
    coverage: {
      provider: 'v8',
      reportsDirectory: '../../coverage/libs/contracts',
      thresholds: { branches: 90, functions: 90, lines: 90, statements: 90 },
    },
    environment: 'node',
    globals: true,
    include: ['src/**/*.spec.ts'],
    name: 'contracts',
    watch: false,
  },
});
