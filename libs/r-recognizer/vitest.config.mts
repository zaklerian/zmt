import { nxViteTsPaths } from '@nx/vite/plugins/nx-tsconfig-paths.plugin';
import react from '@vitejs/plugin-react';
/// <reference types='vitest' />
import { defineConfig } from 'vitest/config';

export default defineConfig({
  cacheDir: '../../node_modules/.vite/r-recognizer-test',
  plugins: [react(), nxViteTsPaths()],
  root: import.meta.dirname,
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      reportsDirectory: '../../coverage/libs/r-recognizer',
    },
    environment: 'jsdom',
    globals: true,
    include: ['src/**/*.{test,spec}.{ts,mts,cts,tsx}'],
    name: 'r-recognizer',
    passWithNoTests: true,
    reporters: ['default'],
  },
});
