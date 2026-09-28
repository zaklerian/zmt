import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { TestBed } from '@angular/core/testing';
import { MatButtonHarness } from '@angular/material/button/testing';
import { By } from '@angular/platform-browser';
import { patchState } from '@ngrx/signals';
import { unprotected } from '@ngrx/signals/testing';
import { AppSettingsStore } from '@zmt/renderer/app-settings/data-access';
import { FileDisplayFormComponent, PluginConfigFormComponent } from '@zmt/renderer/app-settings/ui';
import { EN_MESSAGES } from '@zmt/shared/i18n';

import { AppSettingsComponent } from './app-settings.component';

describe('AppSettingsComponent', () => {
  async function setup() {
    const fixture = TestBed.createComponent(AppSettingsComponent);
    await fixture.whenStable();
    const host: unknown = fixture.nativeElement;
    if (!(host instanceof HTMLElement)) {
      throw new TypeError('fixture host is not an HTMLElement');
    }
    return { fixture, host, loader: TestbedHarnessEnvironment.loader(fixture) };
  }

  it('shows the no-plugins message until plugins are loaded', async () => {
    const { fixture, host } = await setup();
    expect(host.querySelector('h2')?.textContent.trim()).toBe(EN_MESSAGES.appSettings.title);
    expect(host.querySelector('.no-plugins')?.textContent.trim()).toBe(
      EN_MESSAGES.appSettings.noPlugins,
    );
    expect(fixture.componentInstance.dirty()).toBe(false);
  });

  it('tracks draft edits, resets them and saves through the store', async () => {
    const store = TestBed.inject(AppSettingsStore);
    patchState(unprotected(store), {
      activeGameId: 'hoi4',
      plugins: [
        {
          displayName: 'Hearts of Iron IV',
          features: [{ enabled: true, featureId: 'aircraft', label: 'Aircraft' }],
          gameId: 'hoi4',
        },
      ],
    });
    const save = vi.spyOn(store, 'save').mockImplementation(() => ({ destroy: () => undefined }));
    const { fixture, loader } = await setup();

    const pluginForm = fixture.debugElement
      .query(By.directive(PluginConfigFormComponent))
      .injector.get(PluginConfigFormComponent);
    pluginForm.features.set({ aircraft: false });
    await fixture.whenStable();
    expect(fixture.componentInstance.dirty()).toBe(true);
    await (await loader.getHarness(MatButtonHarness.with({ selector: '.discard' }))).click();
    expect(fixture.componentInstance.dirty()).toBe(false);

    const fileDisplay = fixture.debugElement
      .query(By.directive(FileDisplayFormComponent))
      .injector.get(FileDisplayFormComponent);
    fileDisplay.hideUnsupportedFiles.set(true);
    await fixture.whenStable();
    await (await loader.getHarness(MatButtonHarness.with({ selector: '.save' }))).click();
    expect(save).toHaveBeenCalledWith({
      activeGameId: 'hoi4',
      features: {},
      hideUnsupportedFiles: true,
    });
  });
});
