import { inject } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import { By } from '@angular/platform-browser';
import { patchState } from '@ngrx/signals';
import { unprotected } from '@ngrx/signals/testing';
import { fail, ok } from '@zmt/contracts';
import { DialogService, flushPromises } from '@zmt/renderer/core';
import { I18nStore, WorkspaceStore } from '@zmt/renderer/shell/data-access';
import { MESSAGES } from '@zmt/renderer/shell/ui';
import { EN_MESSAGES } from '@zmt/shared/i18n';
import { of } from 'rxjs';

import { ModInfoService, ModInfoStore } from '../data-access';
import { ModInfoFormComponent } from '../ui';
import { ModInfoComponent, SAVED_SNACKBAR_MS } from './mod-info.component';

const SOURCE = 'name="My mod"\nversion="0.1"\nsupported_version="1.14.*"\n';

describe('ModInfoComponent', () => {
  const readDescriptor = vi.fn();
  const writeDescriptor = vi.fn();
  const info = vi.fn();

  beforeEach(() => {
    readDescriptor.mockReset().mockResolvedValue(ok(SOURCE));
    writeDescriptor.mockReset().mockResolvedValue(ok(null));
    info.mockReset().mockReturnValue(of(undefined));
    TestBed.configureTestingModule({
      providers: [
        { provide: ModInfoService, useValue: { readDescriptor, writeDescriptor } },
        { provide: DialogService, useValue: { info } },
        { provide: MESSAGES, useFactory: () => inject(I18nStore).messages },
      ],
    });
  });

  async function setup() {
    const fixture = TestBed.createComponent(ModInfoComponent);
    await fixture.whenStable();
    await flushPromises();
    await fixture.whenStable();
    const host: unknown = fixture.nativeElement;
    if (!(host instanceof HTMLElement)) {
      throw new TypeError('fixture host is not an HTMLElement');
    }
    return { fixture, host };
  }

  it('asks for a root folder before showing the descriptor', async () => {
    const { fixture, host } = await setup();
    expect(host.querySelector('h2')?.textContent.trim()).toBe(EN_MESSAGES.modInfo.title);
    expect(host.querySelector('.no-root')?.textContent.trim()).toBe(EN_MESSAGES.modInfo.noRoot);
    expect(fixture.componentInstance.dirty()).toBe(false);
    expect(readDescriptor).not.toHaveBeenCalled();
  });

  it('loads the descriptor of the open root and renders the form over its values', async () => {
    patchState(unprotected(TestBed.inject(WorkspaceStore)), { root: '/mods/my-mod' });
    const { fixture, host } = await setup();
    expect(readDescriptor).toHaveBeenCalledWith('/mods/my-mod/descriptor.mod');
    expect(host.querySelector('.path')?.textContent.trim()).toBe('/mods/my-mod/descriptor.mod');
    const form = fixture.debugElement
      .query(By.directive(ModInfoFormComponent))
      .injector.get(ModInfoFormComponent);
    expect(form.values().name).toBe('My mod');
    form.values.set({ ...form.values(), version: '0.2' });
    await fixture.whenStable();
    expect(fixture.componentInstance.dirty()).toBe(form.dirty());

    const store = TestBed.inject(ModInfoStore);
    const save = vi.spyOn(store, 'save').mockImplementation(() => ({ destroy: () => undefined }));
    form.save.emit(form.values());
    expect(save).toHaveBeenCalledWith({ ...form.values(), version: '0.2' });
    form.discard.emit();
    await fixture.whenStable();
    expect(form.values().version).toBe('0.1');
  });

  it('shows the load error with a retry that reloads the descriptor', async () => {
    readDescriptor.mockResolvedValueOnce(fail(404, 'missing'));
    patchState(unprotected(TestBed.inject(WorkspaceStore)), { root: '/mods/my-mod' });
    const { fixture, host } = await setup();
    expect(host.querySelector('.load-error')?.textContent.trim()).toBe(
      `${EN_MESSAGES.modInfo.loadFailed} ${EN_MESSAGES.errors[404]}`,
    );
    host.querySelector<HTMLButtonElement>('.retry')?.click();
    await flushPromises();
    await fixture.whenStable();
    expect(readDescriptor).toHaveBeenCalledTimes(2);
    expect(fixture.debugElement.query(By.directive(ModInfoFormComponent))).not.toBeNull();
  });

  it('confirms a successful save with a snackbar and explains a failed one', async () => {
    patchState(unprotected(TestBed.inject(WorkspaceStore)), { root: '/mods/my-mod' });
    const open = vi.spyOn(TestBed.inject(MatSnackBar), 'open');
    const { fixture } = await setup();
    const store = TestBed.inject(ModInfoStore);
    const values = store.values();
    if (values === null) {
      throw new TypeError('descriptor not loaded');
    }
    store.save({ ...values, version: '0.2' });
    await flushPromises();
    await fixture.whenStable();
    expect(open).toHaveBeenCalledWith(EN_MESSAGES.modInfo.saveSuccess, undefined, {
      duration: SAVED_SNACKBAR_MS,
    });

    writeDescriptor.mockResolvedValueOnce(fail(500, 'boom'));
    store.save({ ...values, version: '0.3' });
    await flushPromises();
    await fixture.whenStable();
    expect(info).toHaveBeenCalledWith({
      confirmLabel: EN_MESSAGES.actions.close,
      message: EN_MESSAGES.modInfo.saveFailedMessage,
      title: EN_MESSAGES.modInfo.saveFailedTitle,
    });
  });
});
