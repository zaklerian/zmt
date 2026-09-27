import { provideCheckNoChangesConfig, provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { APP_VERSION } from '@zmt/renderer/app-info/data-access';

import { version } from '../../../../package.json';
import { APP_CONFIG, DEV_PROVIDERS, modeProviders } from './app-config.const';

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

  it('provides the router with the lazy home route and the package version', async () => {
    TestBed.configureTestingModule({ providers: APP_CONFIG.providers });
    const router = TestBed.inject(Router);
    const [home, fallback] = router.config;
    expect(home?.path).toBe('');
    expect(home?.component).toBeUndefined();
    const homeFeature = await import('@zmt/renderer/home/feature');
    await expect(home?.loadChildren?.()).resolves.toBe(homeFeature.HOME_ROUTES);
    expect(fallback?.redirectTo).toBe('');
    expect(TestBed.inject(APP_VERSION)).toBe(version);
  });
});
