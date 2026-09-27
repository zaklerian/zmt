import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { TestBed } from '@angular/core/testing';
import { MatButtonToggleGroupHarness } from '@angular/material/button-toggle/testing';
import { MatButtonHarness } from '@angular/material/button/testing';
import { MatSidenavHarness } from '@angular/material/sidenav/testing';
import { MatToolbarHarness } from '@angular/material/toolbar/testing';
import { provideRouter } from '@angular/router';
import { I18nStore } from '@zmt/renderer/i18n/data-access';
import { EN_MESSAGES, LOCALE, LOCALE_LOADERS, type Messages } from '@zmt/shared/i18n';

import { ShellComponent } from './shell.component';

describe('ShellComponent', () => {
  let deMessages: Messages;

  beforeAll(async () => {
    deMessages = await LOCALE_LOADERS.de();
  });

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
  });

  async function setup() {
    const fixture = TestBed.createComponent(ShellComponent);
    const loader = TestbedHarnessEnvironment.loader(fixture);
    await fixture.whenStable();
    return { fixture, loader };
  }

  it('shows the app title in the toolbar', async () => {
    const { loader } = await setup();
    const toolbar = await loader.getHarness(MatToolbarHarness);
    expect((await toolbar.getRowsAsText()).join(' ')).toContain(EN_MESSAGES.app.title);
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
});
