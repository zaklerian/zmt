import { defineConfig } from 'vitest/config';

export default defineConfig({
  cacheDir: '../../node_modules/.vite/tools/eslint-rules',
  root: import.meta.dirname,
  test: {
    environment: 'node',
    globals: true,
    include: ['src/**/*.spec.ts'],
    name: 'eslint-rules',
    watch: false,
  },
});
