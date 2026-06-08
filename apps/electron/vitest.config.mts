import { nxViteTsPaths } from '@nx/vite/plugins/nx-tsconfig-paths.plugin';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  cacheDir: '../../node_modules/.vite/electron-test',
  plugins: [nxViteTsPaths()],
  root: import.meta.dirname,
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      reportsDirectory: '../../coverage/apps/electron',
    },
    environment: 'node',
    globals: true,
    include: ['src/**/*.{test,spec}.{ts,mts,cts}'],
    name: 'electron',
    passWithNoTests: true,
    reporters: ['default'],
    setupFiles: ['./src/test-setup.ts'],
  },
});
