import { nxViteTsPaths } from '@nx/vite/plugins/nx-tsconfig-paths.plugin';
/// <reference types='vitest' />
import { defineConfig } from 'vitest/config';

export default defineConfig({
  cacheDir: '../../node_modules/.vite/contracts-test',
  plugins: [nxViteTsPaths()],
  root: import.meta.dirname,
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      reportsDirectory: '../../coverage/libs/contracts',
    },
    environment: 'node',
    globals: true,
    include: ['src/**/*.{test,spec}.{ts,mts,cts}'],
    name: 'contracts',
    passWithNoTests: true,
    reporters: ['default'],
  },
});
