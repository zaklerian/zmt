import { defineConfig } from 'vitest/config';

export default defineConfig({
  cacheDir: '../../node_modules/.vite/tools/commitlint-plugin',
  root: import.meta.dirname,
  test: {
    environment: 'node',
    globals: true,
    include: ['src/**/*.spec.ts'],
    name: 'commitlint-plugin',
    watch: false,
  },
});
