import { nxViteTsPaths } from '@nx/vite/plugins/nx-tsconfig-paths.plugin';
/// <reference types='vitest' />
import { defineConfig } from 'vitest/config';

export default defineConfig({
  cacheDir: '../../node_modules/.vite/paradox-parser-test',
  plugins: [nxViteTsPaths()],
  root: import.meta.dirname,
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      reportsDirectory: '../../coverage/libs/paradox-parser',
    },
    environment: 'node',
    globals: true,
    include: ['src/**/*.{test,spec}.{ts,mts,cts}'],
    name: 'paradox-parser',
    passWithNoTests: true,
    reporters: ['default'],
  },
});
