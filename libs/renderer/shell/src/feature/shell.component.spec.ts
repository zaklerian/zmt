import type { Messages } from '@zmt/shared/i18n';

import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { TestBed } from '@angular/core/testing';
import { MatButtonToggleGroupHarness } from '@angular/material/button-toggle/testing';
import { MatButtonHarness } from '@angular/material/button/testing';
import { MatNavListHarness } from '@angular/material/list/testing';
import { MatSidenavHarness } from '@angular/material/sidenav/testing';
import { MatToolbarHarness } from '@angular/material/toolbar/testing';
import { provideRouter, Router } from '@angular/router';
import { patchState } from '@ngrx/signals';
import { unprotected } from '@ngrx/signals/testing';
import { EN_MESSAGES, LOCALE, LOCALE_LOADERS } from '@zmt/shared/i18n';

import type { NavEntry } from '../ui';

import { APP_VERSION, I18nStore, WorkspaceStore } from '../data-access';
import { NAV_ENTRIES } from '../ui';
import { ShellComponent } from './shell.component';

const ENTRIES: readonly NavEntry[] = [
  { icon: 'home', label: 'home', path: '' },
  { icon: 'settings', label: 'appSettings', path: 'settings' },
];

describe('ShellComponent', () => {
  let deMessages: Messages;

  beforeAll(async () => {
    deMessages = await LOCALE_LOADERS.de();
  });

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: APP_VERSION, useValue: '1.2.3' },
        { provide: NAV_ENTRIES, useValue: ENTRIES },
      ],
    });
  });

  async function setup() {
    const fixture = TestBed.createComponent(ShellComponent);
    const loader = TestbedHarnessEnvironment.loader(fixture);
    await fixture.whenStable();
    return { fixture, loader };
  }

  it('shows the app title in the toolbar and the version in the footer', async () => {
    const { fixture, loader } = await setup();
    const toolbar = await loader.getHarness(MatToolbarHarness);
    expect((await toolbar.getRowsAsText()).join(' ')).toContain(EN_MESSAGES.app.title);
    const host: unknown = fixture.nativeElement;
    expect(host instanceof HTMLElement && host.querySelector('footer')?.textContent.trim()).toBe(
      EN_MESSAGES.home.version('1.2.3'),
    );
  });

  it('renders one navigation link per provided entry', async () => {
    const { loader } = await setup();
    const list = await loader.getHarness(MatNavListHarness);
    const items = await list.getItems();
    expect(await Promise.all(items.map((item) => item.getTitle()))).toEqual([
      EN_MESSAGES.nav.home,
      EN_MESSAGES.nav.appSettings,
    ]);
  });

  it('renders one toggle per locale with the active locale checked', async () => {
    const { loader } = await setup();
    const group = await loader.getHarness(MatButtonToggleGroupHarness);
    const toggles = await group.getToggles();
    expect(await Promise.all(toggles.map((toggle) => toggle.getText()))).toEqual([
      EN_MESSAGES.locale.en,
      EN_MESSAGES.locale.de,
    ]);
    expect(await toggles[0]?.isChecked()).toBe(true);
    expect(await toggles[1]?.isChecked()).toBe(false);
  });

  it('switches the store locale and the toolbar text when the German toggle is chosen', async () => {
    const { loader } = await setup();
    const store = TestBed.inject(I18nStore);
    const group = await loader.getHarness(MatButtonToggleGroupHarness);
    const [, german] = await group.getToggles();
    await german?.check();

    await vi.waitFor(() => {
      expect(store.locale()).toBe(LOCALE.de);
    });
    const toolbar = await loader.getHarness(MatToolbarHarness);
    expect((await toolbar.getRowsAsText()).join(' ')).toContain(deMessages.app.title);
    expect(await german?.isChecked()).toBe(true);
  });

  it('keeps the navigation rail open and toggles its expanded state', async () => {
    const { loader } = await setup();
    const sidenav = await loader.getHarness(MatSidenavHarness);
    expect(await sidenav.isOpen()).toBe(true);
    expect(await sidenav.getMode()).toBe('side');

    const toggle = await loader.getHarness(
      MatButtonHarness.with({ selector: '.navigation-toggle' }),
    );
    const host = await toggle.host();
    expect(await host.getAttribute('aria-label')).toBe(EN_MESSAGES.shell.toggleNavigation);
    expect(await host.getAttribute('aria-expanded')).toBe('false');
    await toggle.click();
    expect(await host.getAttribute('aria-expanded')).toBe('true');
    expect(await (await sidenav.host()).hasClass('expanded')).toBe(true);
  });

  it('navigates to the settings page from the toolbar', async () => {
    const { loader } = await setup();
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    await (await loader.getHarness(MatButtonHarness.with({ selector: '.open-settings' }))).click();
    expect(navigate).toHaveBeenCalledWith(['/', 'settings']);
  });

  it('navigates to the mod content page when a root folder opens', async () => {
    const { fixture } = await setup();
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    const workspace = TestBed.inject(WorkspaceStore);
    patchState(unprotected(workspace), { root: '/mods/my-mod' });
    await fixture.whenStable();
    expect(navigate).toHaveBeenCalledWith(['/', 'mod-content']);
    patchState(unprotected(workspace), { root: null });
    await fixture.whenStable();
    expect(navigate).toHaveBeenCalledTimes(1);
  });

  it('opens the folder dialog from the toolbar', async () => {
    const { loader } = await setup();
    const openFolder = vi
      .spyOn(TestBed.inject(WorkspaceStore), 'openFolder')
      .mockImplementation(() => ({ destroy: () => undefined }));
    await (await loader.getHarness(MatButtonHarness.with({ selector: '.open-folder' }))).click();
    expect(openFolder).toHaveBeenCalledTimes(1);
  });
});
