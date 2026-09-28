import { workspaceRoot } from '@nx/devkit';
import { _electron as electron, type ElectronApplication, type Page } from '@playwright/test';
import path from 'node:path';

export interface LaunchedApp {
  readonly app: ElectronApplication;
  readonly page: Page;
}

export const MAIN_BUNDLE = path.join(workspaceRoot, 'dist', 'apps', 'main', 'main.js');

export const APP_ROUTE_URL = 'zmt://renderer/';

export function launchArgs(): readonly string[] {
  const args = [MAIN_BUNDLE];
  return process.getuid?.() === 0 ? [...args, '--no-sandbox'] : args;
}

export async function launchApp(): Promise<LaunchedApp> {
  const env: Record<string, string> = {};
  for (const [key, value] of Object.entries(process.env)) {
    if (value !== undefined && key !== 'ZMT_RENDERER_URL' && key !== 'ZMT_DEFAULT_MODS_PATH') {
      env[key] = value;
    }
  }
  const app = await electron.launch({ args: [...launchArgs()], env });
  const page = await app.firstWindow();
  await page.waitForLoadState('load');
  await page.waitForURL(APP_ROUTE_URL);
  return { app, page };
}
