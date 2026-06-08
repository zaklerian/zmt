import { nxViteTsPaths } from '@nx/vite/plugins/nx-tsconfig-paths.plugin';
/// <reference types='vitest' />
import { defineConfig } from 'vitest/config';

export default defineConfig({
  cacheDir: '../../node_modules/.vite/e-game-hoi4-test',
  plugins: [nxViteTsPaths()],
  root: import.meta.dirname,
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      reportsDirectory: '../../coverage/libs/e-game-hoi4',
    },
    environment: 'node',
    globals: true,
    include: ['src/**/*.{test,spec}.{ts,mts,cts}'],
    name: 'e-game-hoi4',
    passWithNoTests: true,
    reporters: ['default'],
  },
});
