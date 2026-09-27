import { defineConfig } from 'vitest/config';

export default defineConfig({
  cacheDir: '../../../node_modules/.vite/libs/shared/i18n',
  root: import.meta.dirname,
  test: {
    coverage: {
      provider: 'v8',
      reportsDirectory: '../../../coverage/libs/shared/i18n',
      thresholds: { branches: 90, functions: 90, lines: 90, statements: 90 },
    },
    environment: 'node',
    globals: true,
    include: ['src/**/*.spec.ts'],
    name: 'shared-i18n',
    watch: false,
  },
});
