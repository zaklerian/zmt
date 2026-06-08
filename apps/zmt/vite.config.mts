import { nxCopyAssetsPlugin } from '@nx/vite/plugins/nx-copy-assets.plugin';
import { nxViteTsPaths } from '@nx/vite/plugins/nx-tsconfig-paths.plugin';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig(() => ({
  build: {
    commonjsOptions: {
      transformMixedEsModules: true,
    },
    emptyOutDir: true,
    outDir: '../../dist/apps/zmt',
    reportCompressedSize: true,
  },
  cacheDir: '../node_modules/.vite/zmt',
  plugins: [react(), nxViteTsPaths(), nxCopyAssetsPlugin(['*.md'])],
  preview: {
    host: 'localhost',
    port: 4200,
  },
  root: import.meta.dirname,
  server: {
    host: 'localhost',
    port: 4200,
  },
}));
