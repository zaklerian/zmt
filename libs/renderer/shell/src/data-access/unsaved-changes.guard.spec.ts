import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { type ActivatedRouteSnapshot, type RouterStateSnapshot } from '@angular/router';
import { DialogService } from '@zmt/renderer/core';
import { EN_MESSAGES } from '@zmt/shared/i18n';
import { firstValueFrom, isObservable, of } from 'rxjs';

import { unsavedChangesGuard } from './unsaved-changes.guard';

describe('unsavedChangesGuard', () => {
  const route = {} as unknown as ActivatedRouteSnapshot;
  const state = {} as unknown as RouterStateSnapshot;

  function run(dirty: boolean) {
    return TestBed.runInInjectionContext(() =>
      unsavedChangesGuard({ dirty: signal(dirty) }, route, state, state),
    );
  }

  it('lets a clean component leave without asking', () => {
    const confirm = vi.spyOn(TestBed.inject(DialogService), 'confirm');
    expect(run(false)).toBe(true);
    expect(confirm).not.toHaveBeenCalled();
  });

  it('asks to discard unsaved changes with localized labels and forwards the answer', async () => {
    const confirm = vi.spyOn(TestBed.inject(DialogService), 'confirm').mockReturnValue(of(false));
    const result = run(true);
    expect(isObservable(result)).toBe(true);
    await expect(firstValueFrom(isObservable(result) ? result : of(result))).resolves.toBe(false);
    expect(confirm).toHaveBeenCalledWith({
      cancelLabel: EN_MESSAGES.actions.cancel,
      confirmLabel: EN_MESSAGES.actions.discard,
      message: EN_MESSAGES.dialog.unsavedChangesMessage,
      title: EN_MESSAGES.dialog.unsavedChangesTitle,
    });
  });
});
