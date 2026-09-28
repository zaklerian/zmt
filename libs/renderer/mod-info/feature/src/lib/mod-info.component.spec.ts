import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { patchState } from '@ngrx/signals';
import { unprotected } from '@ngrx/signals/testing';
import { ModInfoStore } from '@zmt/renderer/mod-info/data-access';
import { ModInfoFormComponent } from '@zmt/renderer/mod-info/ui';
import { WorkspaceStore } from '@zmt/renderer/workspace/data-access';
import { EN_MESSAGES } from '@zmt/shared/i18n';

import { ModInfoComponent } from './mod-info.component';

describe('ModInfoComponent', () => {
  async function setup() {
    const fixture = TestBed.createComponent(ModInfoComponent);
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
  });

  it('renders the form over the loaded values and reflects its dirtiness', async () => {
    patchState(unprotected(TestBed.inject(WorkspaceStore)), { root: '/mods/my-mod' });
    patchState(unprotected(TestBed.inject(ModInfoStore)), {
      values: {
        name: 'My mod',
        path: '',
        picture: '',
        supportedVersion: '1.14.*',
        tags: [],
        version: '0.1',
      },
    });
    const { fixture } = await setup();
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
});
