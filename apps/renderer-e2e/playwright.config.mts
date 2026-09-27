import { workspaceRoot } from '@nx/devkit';
import { nxE2EPreset } from '@nx/playwright/preset';
import { defineConfig, devices } from '@playwright/test';

const BASE_URL = 'http://localhost:4200';
const CHROMIUM_PATH = process.env['PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH'];

export default defineConfig({
  ...nxE2EPreset(import.meta.dirname, { testDir: './src' }),
  forbidOnly: Boolean(process.env['CI']),
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  retries: 0,
  use: {
    baseURL: BASE_URL,
    ...(CHROMIUM_PATH ? { launchOptions: { executablePath: CHROMIUM_PATH } } : {}),
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'pnpm exec nx run renderer:serve',
    cwd: workspaceRoot,
    reuseExistingServer: true,
    timeout: 180_000,
    url: BASE_URL,
  },
});
