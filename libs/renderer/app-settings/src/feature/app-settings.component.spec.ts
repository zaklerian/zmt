import type { GamePlugin } from '@zmt/contracts';

import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { inject } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MatButtonHarness } from '@angular/material/button/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import { By } from '@angular/platform-browser';
import { fail, ok } from '@zmt/contracts';
import { DialogService, flushPromises } from '@zmt/renderer/core';
import { I18nStore } from '@zmt/renderer/shell/data-access';
import { MESSAGES } from '@zmt/renderer/shell/ui';
import { EN_MESSAGES } from '@zmt/shared/i18n';
import { of } from 'rxjs';

import { AppSettingsStore, PluginService } from '../data-access';
import { FileDisplayFormComponent, PluginConfigFormComponent } from '../ui';
import { AppSettingsComponent, SAVED_SNACKBAR_MS } from './app-settings.component';

const HOI4: GamePlugin = {
  displayName: 'Hearts of Iron IV',
  features: [{ enabled: true, featureId: 'aircraft', label: 'Aircraft' }],
  gameId: 'hoi4',
};

const STELLARIS: GamePlugin = { displayName: 'Stellaris', features: [], gameId: 'stellaris' };

describe('AppSettingsComponent', () => {
  const list = vi.fn();
  const confirm = vi.fn();

  beforeEach(() => {
    list.mockReset().mockResolvedValue(ok([HOI4, STELLARIS]));
    confirm.mockReset().mockReturnValue(of(true));
    TestBed.configureTestingModule({
      providers: [
        { provide: PluginService, useValue: { list } },
        { provide: DialogService, useValue: { confirm } },
        { provide: MESSAGES, useFactory: () => inject(I18nStore).messages },
      ],
    });
  });

  async function setup() {
    const fixture = TestBed.createComponent(AppSettingsComponent);
    await fixture.whenStable();
    await flushPromises();
    await fixture.whenStable();
    const host: unknown = fixture.nativeElement;
    if (!(host instanceof HTMLElement)) {
      throw new TypeError('fixture host is not an HTMLElement');
    }
    return { fixture, host, loader: TestbedHarnessEnvironment.loader(fixture) };
  }

  it('shows the no-plugins message when the list comes back empty', async () => {
    list.mockResolvedValue(ok([]));
    const { fixture, host } = await setup();
    expect(host.querySelector('h2')?.textContent.trim()).toBe(EN_MESSAGES.appSettings.title);
    expect(host.querySelector('.no-plugins')?.textContent.trim()).toBe(
      EN_MESSAGES.appSettings.noPlugins,
    );
    expect(fixture.componentInstance.dirty()).toBe(false);
  });

  it('shows the load error', async () => {
    list.mockResolvedValue(fail(500, 'boom'));
    const { host } = await setup();
    expect(host.querySelector('.error')?.textContent.trim()).toBe(
      `${EN_MESSAGES.appSettings.loadFailed} ${EN_MESSAGES.errors[500]}`,
    );
    expect(host.querySelector('.no-plugins')).toBeNull();
  });

  it('loads the plugins, tracks draft edits, resets them and saves through the store', async () => {
    const store = TestBed.inject(AppSettingsStore);
    const open = vi.spyOn(TestBed.inject(MatSnackBar), 'open');
    const { fixture, loader } = await setup();
    expect(list).toHaveBeenCalledTimes(1);
    expect(store.activeGameId()).toBe('hoi4');

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
    expect(store.values()).toEqual({
      activeGameId: 'hoi4',
      features: {},
      hideUnsupportedFiles: true,
    });
    await fixture.whenStable();
    expect(open).toHaveBeenCalledWith(EN_MESSAGES.appSettings.saved, undefined, {
      duration: SAVED_SNACKBAR_MS,
    });
    expect(fixture.componentInstance.dirty()).toBe(false);
  });

  it('shows the saved snackbar once per save and not again when the route is re-entered', async () => {
    const open = vi.spyOn(TestBed.inject(MatSnackBar), 'open');
    const first = await setup();
    const fileDisplay = first.fixture.debugElement
      .query(By.directive(FileDisplayFormComponent))
      .injector.get(FileDisplayFormComponent);
    fileDisplay.hideUnsupportedFiles.set(true);
    await first.fixture.whenStable();
    await (await first.loader.getHarness(MatButtonHarness.with({ selector: '.save' }))).click();
    await first.fixture.whenStable();
    expect(open).toHaveBeenCalledTimes(1);
    expect(TestBed.inject(AppSettingsStore).saveStatus()).toEqual({ kind: 'success' });

    first.fixture.destroy();
    const second = await setup();
    expect(second.fixture.componentInstance.dirty()).toBe(false);
    expect(open).toHaveBeenCalledTimes(1);

    const secondFileDisplay = second.fixture.debugElement
      .query(By.directive(FileDisplayFormComponent))
      .injector.get(FileDisplayFormComponent);
    secondFileDisplay.hideUnsupportedFiles.set(false);
    await second.fixture.whenStable();
    await (await second.loader.getHarness(MatButtonHarness.with({ selector: '.save' }))).click();
    await second.fixture.whenStable();
    expect(open).toHaveBeenCalledTimes(2);
  });

  it('switches the game directly when clean and asks first when dirty', async () => {
    const store = TestBed.inject(AppSettingsStore);
    const { fixture } = await setup();
    const pluginForm = fixture.debugElement
      .query(By.directive(PluginConfigFormComponent))
      .injector.get(PluginConfigFormComponent);

    pluginForm.gameChange.emit('hoi4');
    pluginForm.gameChange.emit('stellaris');
    expect(confirm).not.toHaveBeenCalled();
    expect(store.activeGameId()).toBe('stellaris');

    pluginForm.features.set({ aircraft: false });
    await fixture.whenStable();
    confirm.mockReturnValue(of(false));
    pluginForm.gameChange.emit('hoi4');
    expect(confirm).toHaveBeenCalledWith({
      cancelLabel: EN_MESSAGES.actions.cancel,
      confirmLabel: EN_MESSAGES.actions.discard,
      message: EN_MESSAGES.appSettings.gameSwitchMessage,
      title: EN_MESSAGES.dialog.unsavedChangesTitle,
    });
    expect(store.activeGameId()).toBe('stellaris');
    expect(fixture.componentInstance.dirty()).toBe(true);

    confirm.mockReturnValue(of(true));
    pluginForm.gameChange.emit('hoi4');
    expect(store.activeGameId()).toBe('hoi4');
    expect(fixture.componentInstance.dirty()).toBe(false);
  });
});
