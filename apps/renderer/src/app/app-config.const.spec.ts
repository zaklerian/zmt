import { provideCheckNoChangesConfig, provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { APP_VERSION } from '@zmt/renderer/app-info/data-access';
import { NAV_ENTRIES } from '@zmt/renderer/shell/ui';

import { version } from '../../../../package.json';
import { APP_CONFIG, DEV_PROVIDERS, modeProviders } from './app-config.const';
import { APP_NAV_ENTRIES } from './app-navigation.const';

describe('APP_CONFIG', () => {
  it('enables exhaustive checkNoChanges in dev mode (NG-13)', () => {
    expect(DEV_PROVIDERS).toEqual([provideCheckNoChangesConfig({ exhaustive: true })]);
    expect(DEV_PROVIDERS).not.toEqual([provideCheckNoChangesConfig({ exhaustive: false })]);
    expect(APP_CONFIG.providers).toEqual(expect.arrayContaining([...DEV_PROVIDERS]));
  });

  it('adds the dev providers only in dev mode', () => {
    expect(modeProviders(true)).toBe(DEV_PROVIDERS);
    expect(modeProviders(false)).toEqual([]);
  });

  it('bootstraps zoneless change detection without zone.js (NG-2)', () => {
    expect(APP_CONFIG.providers).toContainEqual(provideZonelessChangeDetection());
    expect(Reflect.get(globalThis, 'Zone')).toBeUndefined();
  });

  it('provides one lazy route per domain, the package version and the nav entries', async () => {
    TestBed.configureTestingModule({ providers: APP_CONFIG.providers });
    const router = TestBed.inject(Router);
    const routes = router.config;
    const fallback = routes.at(-1);
    expect(fallback?.redirectTo).toBe('');
    expect(routes.slice(0, -1).map((route) => route.path)).toEqual([
      '',
      'mod-content',
      'mod-info',
      'features',
      'tech-tree',
      'settings',
    ]);
    for (const route of routes.slice(0, -1)) {
      expect(route.component).toBeUndefined();
    }
    const [home, modContent, modInfo, featureNav, techTree, appSettings] = routes;
    await expect(home?.loadChildren?.()).resolves.toBe(
      (await import('@zmt/renderer/home/feature')).HOME_ROUTES,
    );
    await expect(modContent?.loadChildren?.()).resolves.toBe(
      (await import('@zmt/renderer/mod-content/feature')).MOD_CONTENT_ROUTES,
    );
    await expect(modInfo?.loadChildren?.()).resolves.toBe(
      (await import('@zmt/renderer/mod-info/feature')).MOD_INFO_ROUTES,
    );
    await expect(featureNav?.loadChildren?.()).resolves.toBe(
      (await import('@zmt/renderer/feature-nav/feature')).FEATURE_NAV_ROUTES,
    );
    await expect(techTree?.loadChildren?.()).resolves.toBe(
      (await import('@zmt/renderer/tech-tree/feature')).TECH_TREE_ROUTES,
    );
    await expect(appSettings?.loadChildren?.()).resolves.toBe(
      (await import('@zmt/renderer/app-settings/feature')).APP_SETTINGS_ROUTES,
    );
    expect(TestBed.inject(APP_VERSION)).toBe(version);
    expect(TestBed.inject(NAV_ENTRIES)).toBe(APP_NAV_ENTRIES);
    expect(APP_NAV_ENTRIES.map((entry) => entry.path)).toEqual(
      routes.slice(0, -1).map((route) => route.path),
    );
  });
});
