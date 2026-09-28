import AxeBuilder from '@axe-core/playwright';
import { expect, type Page, test } from '@playwright/test';

import { launchApp, type LaunchedApp } from './electron-app.util';

async function expectNoAxeViolations(page: Page): Promise<void> {
  const results = await new AxeBuilder({ page }).setLegacyMode(true).analyze();
  expect(results.violations).toEqual([]);
}

test.describe('electron shell', () => {
  let launched: LaunchedApp;

  test.beforeEach(async () => {
    launched = await launchApp();
  });

  test.afterEach(async () => {
    await launched.app.close();
  });

  test('launches from the packaged origin and renders the shell and lazy home page', async () => {
    const { page } = launched;
    await expect(page.getByRole('banner')).toBeVisible();
    expect(page.url()).toBe('zmt://renderer/');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('ZMT — Mod Manager');
    await expect(page.getByRole('heading', { level: 2 })).toHaveText('Welcome to ZMT');
    await expect(page.getByRole('navigation', { name: 'Main navigation' })).toBeAttached();
    await expectNoAxeViolations(page);
  });

  test('switches toolbar and home texts between English and German without reload', async () => {
    const { page } = launched;
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
    await expect(page).toHaveTitle('ZMT — Mod-Verwaltung');
    await expectNoAxeViolations(page);

    await page
      .getByRole('radiogroup', { name: 'Sprache' })
      .getByRole('radio', { name: 'English' })
      .click();
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('ZMT — Mod Manager');
    expect(navigations).toBe(0);
  });

  test('renders the dark scheme without accessibility violations', async () => {
    const { page } = launched;
    await page.emulateMedia({ colorScheme: 'dark' });
    await expect(page.getByRole('heading', { level: 2 })).toHaveText('Welcome to ZMT');
    await expectNoAxeViolations(page);
  });

  test('exposes exactly the contract api and no Node globals in the renderer', async () => {
    const { page } = launched;
    const shape = await page.evaluate(() =>
      Object.fromEntries(
        Object.entries(window.api).map(([group, methods]) => [
          group,
          Object.keys(methods as object).sort(),
        ]),
      ),
    );
    expect(shape).toEqual({
      fs: [
        'listDirectory',
        'openFolderDialog',
        'readTextFile',
        'searchFiles',
        'writeBinaryFile',
        'writeTextFile',
      ],
      plugins: ['list'],
      system: ['ping'],
    });
    const globals = await page.evaluate(() => ({
      buffer: typeof Reflect.get(window, 'Buffer'),
      ipcRenderer: typeof Reflect.get(window, 'ipcRenderer'),
      process: typeof Reflect.get(window, 'process'),
      require: typeof Reflect.get(window, 'require'),
    }));
    expect(globals).toEqual({
      buffer: 'undefined',
      ipcRenderer: 'undefined',
      process: 'undefined',
      require: 'undefined',
    });
  });

  test('answers ipc calls with result envelopes through the real bridge', async () => {
    const { page } = launched;
    await expect(page.evaluate(async () => window.api.system.ping())).resolves.toEqual({
      data: 'pong',
      ok: true,
    });
    await expect(page.evaluate(async () => window.api.plugins.list())).resolves.toEqual({
      data: [
        {
          displayName: 'Hearts of Iron IV',
          features: [{ enabled: true, featureId: 'aircraft', label: 'Aircraft' }],
          gameId: 'hoi4',
        },
      ],
      ok: true,
    });
    await expect(
      page.evaluate(async () => window.api.fs.listDirectory({ path: '/' })),
    ).resolves.toEqual({ error: { code: 403, message: 'No root folder is open' }, ok: false });
    await expect(
      page.evaluate(async () =>
        window.api.fs.readTextFile({ path: 42 } as unknown as { readonly path: string }),
      ),
    ).resolves.toEqual({
      error: { code: 400, message: 'Invalid request for fs:readTextFile' },
      ok: false,
    });
  });

  test('blocks navigation and window.open to external urls', async () => {
    const { app, page } = launched;
    const opened = await page.evaluate(() => window.open('https://example.com/') === null);
    expect(opened).toBe(true);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('ZMT — Mod Manager');
    const windowCount = await app.evaluate(
      (electronApi) => electronApi.BrowserWindow.getAllWindows().length,
    );
    expect(windowCount).toBe(1);

    await app.evaluate((electronApi) => {
      const [window] = electronApi.BrowserWindow.getAllWindows();
      let attempts: readonly { readonly prevented: boolean; readonly url: string }[] = [];
      Reflect.set(globalThis, 'navigationAttempts', attempts);
      window?.webContents.on('will-navigate', (event, url) => {
        attempts = [...attempts, { prevented: event.defaultPrevented, url }];
        Reflect.set(globalThis, 'navigationAttempts', attempts);
      });
    });
    await page.evaluate(() => {
      window.location.assign('https://example.com/');
    });
    await expect
      .poll(async () =>
        app.evaluate(() => JSON.stringify(Reflect.get(globalThis, 'navigationAttempts'))),
      )
      .toBe(JSON.stringify([{ prevented: true, url: 'https://example.com/' }]));
    const currentUrl = await app.evaluate((electronApi) =>
      electronApi.BrowserWindow.getAllWindows()[0]?.webContents.getURL(),
    );
    expect(currentUrl).toBe('zmt://renderer/');
  });

  test('serves the page under a nonce-bound content security policy', async () => {
    const { page } = launched;
    const csp = await page.evaluate(async () => {
      const response = await fetch('zmt://renderer/index.html');
      return response.headers.get('content-security-policy');
    });
    expect(csp).toContain("default-src 'self'");
    expect(csp).toMatch(/script-src 'self' 'nonce-[^']+'/u);
    expect(csp).not.toContain('unsafe-inline');
    expect(csp).not.toContain('unsafe-eval');
    const inlineRan = await page.evaluate(() => {
      const script = document.createElement('script');
      script.textContent = 'window.__zmtInline = true;';
      document.head.appendChild(script);
      return Reflect.has(window, '__zmtInline');
    });
    expect(inlineRan).toBe(false);
  });
});
