import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { TestBed } from '@angular/core/testing';
import { MatButtonToggleGroupHarness } from '@angular/material/button-toggle/testing';
import { MatButtonHarness } from '@angular/material/button/testing';
import { MatToolbarHarness } from '@angular/material/toolbar/testing';
import { EN_MESSAGES, LOCALES } from '@zmt/shared/i18n';

import { AppToolbarComponent } from './app-toolbar.component';

describe('AppToolbarComponent', () => {
  async function setup() {
    const fixture = TestBed.createComponent(AppToolbarComponent);
    fixture.componentRef.setInput('locale', 'en');
    fixture.componentRef.setInput('locales', LOCALES);
    fixture.componentRef.setInput('messages', EN_MESSAGES);
    await fixture.whenStable();
    return { fixture, loader: TestbedHarnessEnvironment.loader(fixture) };
  }

  it('shows the title, the chrome actions and the locale toggles', async () => {
    const { loader } = await setup();
    const toolbar = await loader.getHarness(MatToolbarHarness);
    expect((await toolbar.getRowsAsText()).join(' ')).toContain(EN_MESSAGES.app.title);
    const openFolder = await loader.getHarness(MatButtonHarness.with({ selector: '.open-folder' }));
    expect(await (await openFolder.host()).getAttribute('aria-label')).toBe(
      EN_MESSAGES.shell.openFolder,
    );
    const group = await loader.getHarness(MatButtonToggleGroupHarness);
    expect(await group.getToggles()).toHaveLength(LOCALES.length);
  });

  it('emits the chrome events and the chosen locale', async () => {
    const { fixture, loader } = await setup();
    const events = vi.fn<(event: string) => void>();
    fixture.componentInstance.toggleNavigation.subscribe(() => {
      events('toggle');
    });
    fixture.componentInstance.openFolder.subscribe(() => {
      events('folder');
    });
    fixture.componentInstance.openSettings.subscribe(() => {
      events('settings');
    });
    fixture.componentInstance.localeChange.subscribe((locale) => {
      events(locale);
    });

    await (
      await loader.getHarness(MatButtonHarness.with({ selector: '.navigation-toggle' }))
    ).click();
    await (await loader.getHarness(MatButtonHarness.with({ selector: '.open-folder' }))).click();
    await (await loader.getHarness(MatButtonHarness.with({ selector: '.open-settings' }))).click();
    const [, german] = await (await loader.getHarness(MatButtonToggleGroupHarness)).getToggles();
    await german?.check();

    expect(events.mock.calls).toEqual([['toggle'], ['folder'], ['settings'], ['de']]);
  });
});
