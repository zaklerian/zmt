import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, type ViteUserConfig } from 'vitest/config';

const WORKSPACE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

interface TsconfigBase {
  readonly compilerOptions: { readonly paths: Readonly<Record<string, readonly string[]>> };
}

export function workspaceAliases(): Readonly<Record<string, string>> {
  const base = JSON.parse(
    readFileSync(path.join(WORKSPACE_ROOT, 'tsconfig.base.json'), 'utf8'),
  ) as TsconfigBase;
  return Object.fromEntries(
    Object.entries(base.compilerOptions.paths).map(([alias, targets]) => [
      alias,
      path.join(WORKSPACE_ROOT, targets[0] ?? ''),
    ]),
  );
}

export function rendererVitestConfig(projectDir: string, name: string): ViteUserConfig {
  const relativeRoot = path.relative(projectDir, WORKSPACE_ROOT);
  return defineConfig({
    cacheDir: path.join(
      relativeRoot,
      'node_modules/.vite',
      path.relative(WORKSPACE_ROOT, projectDir),
    ),
    resolve: { alias: workspaceAliases() },
    root: projectDir,
    test: {
      environment: 'jsdom',
      globals: true,
      include: ['src/**/*.spec.ts'],
      name,
      pool: 'threads',
      setupFiles: [path.join(WORKSPACE_ROOT, 'tools/scripts/renderer-test-setup.ts')],
      watch: false,
    },
  });
}
