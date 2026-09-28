import { nxE2EPreset } from '@nx/playwright/preset';
import { defineConfig } from '@playwright/test';

export default defineConfig({
  ...nxE2EPreset(import.meta.dirname, { testDir: './src' }),
  forbidOnly: Boolean(process.env['CI']),
  projects: [{ name: 'electron' }],
  retries: 0,
  timeout: 60_000,
  use: {
    trace: 'retain-on-failure',
  },
  workers: 1,
});
