import AxeBuilder from '@axe-core/playwright';
import { expect, type Page, test } from '@playwright/test';

async function expectNoAxeViolations(page: Page): Promise<void> {
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
}

test.describe('renderer shell', () => {
  test('loads the shell and the lazy home page without accessibility violations', async ({
    page,
  }) => {
    await page.goto('/');
    await expect(page.getByRole('banner')).toBeVisible();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('ZMT — Mod Manager');
    await expect(page.getByRole('heading', { level: 2 })).toHaveText('Welcome to ZMT');
    await expect(page.getByRole('navigation', { name: 'Main navigation' })).toBeAttached();
    await expectNoAxeViolations(page);
  });

  test('switches toolbar and home texts between English and German without reload', async ({
    page,
  }) => {
    await page.goto('/');
    const locale = page.getByRole('radiogroup', { name: 'Language' });
    let navigations = 0;
    page.on('framenavigated', () => {
      navigations += 1;
    });

    await locale.getByRole('radio', { name: 'Deutsch' }).click();
    await expect(page.locator('html')).toHaveAttribute('lang', 'de');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('ZMT — Mod-Verwaltung');
    await expect(page.getByRole('heading', { level: 2 })).toHaveText('Willkommen bei ZMT');
    await expect(page.getByRole('radiogroup', { name: 'Sprache' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Navigation umschalten' })).toBeVisible();
    await expect(page).toHaveTitle('ZMT — Mod-Verwaltung');
    await expectNoAxeViolations(page);

    await page
      .getByRole('radiogroup', { name: 'Sprache' })
      .getByRole('radio', { name: 'English' })
      .click();
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('ZMT — Mod Manager');
    await expect(page.getByRole('heading', { level: 2 })).toHaveText('Welcome to ZMT');
    expect(navigations).toBe(0);
  });
});

test.describe('renderer shell in dark mode', () => {
  test.use({ colorScheme: 'dark' });

  test('renders the dark scheme without accessibility violations', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 2 })).toHaveText('Welcome to ZMT');
    await expectNoAxeViolations(page);
  });
});
