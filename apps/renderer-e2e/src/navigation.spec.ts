import AxeBuilder from '@axe-core/playwright';
import { expect, type Page, test } from '@playwright/test';

import { closeApp, launchApp, type LaunchedApp } from './electron-app.util';

interface RoutedDomain {
  readonly heading: string;
  readonly link: string;
  readonly url: string;
}

const DOMAINS: readonly RoutedDomain[] = [
  { heading: 'Mod content', link: 'Mod content', url: 'zmt://renderer/mod-content' },
  { heading: 'Mod descriptor', link: 'Mod descriptor', url: 'zmt://renderer/mod-info' },
  { heading: 'Features', link: 'Features', url: 'zmt://renderer/features' },
  { heading: 'Tech tree', link: 'Tech tree', url: 'zmt://renderer/tech-tree' },
  { heading: 'App settings', link: 'Settings', url: 'zmt://renderer/settings' },
  { heading: 'Welcome to ZMT', link: 'Home', url: 'zmt://renderer/' },
];

function collectErrors(page: Page): readonly string[] {
  const errors = new Set<string>();
  page.on('console', (message) => {
    if (message.type() === 'error') {
      errors.add(message.text());
    }
  });
  page.on('pageerror', (error) => {
    errors.add(error.message);
  });
  return [...errors];
}

async function expectNoAxeViolations(page: Page): Promise<void> {
  const results = await new AxeBuilder({ page }).setLegacyMode(true).analyze();
  expect(results.violations).toEqual([]);
}

test.describe('domain navigation', () => {
  let launched: LaunchedApp;

  test.beforeEach(async () => {
    launched = await launchApp();
  });

  test.afterEach(async () => {
    await closeApp(launched);
  });

  test('reaches every routed domain from the drawer without console errors', async () => {
    const { page } = launched;
    const errors = collectErrors(page);
    const navigation = page.getByRole('navigation', { name: 'Main navigation' });
    await expect(navigation.getByRole('link')).toHaveCount(DOMAINS.length);

    for (const domain of DOMAINS) {
      await navigation.getByRole('link', { exact: true, name: domain.link }).click();
      await expect(page.getByRole('heading', { level: 2 })).toHaveText(domain.heading);
      expect(page.url()).toBe(domain.url);
      await expectNoAxeViolations(page);
    }
    expect(errors).toEqual([]);
  });
});
