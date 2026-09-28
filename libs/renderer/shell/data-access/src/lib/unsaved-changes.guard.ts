import type { CanDeactivateFn } from '@angular/router';

import { inject } from '@angular/core';
import { DialogService, type HasUnsavedChanges } from '@zmt/renderer/dialog/util';
import { I18nStore } from '@zmt/renderer/i18n/data-access';

export const unsavedChangesGuard: CanDeactivateFn<HasUnsavedChanges> = (component) => {
  if (!component.dirty()) {
    return true;
  }
  const messages = inject(I18nStore).messages();
  return inject(DialogService).confirm({
    cancelLabel: messages.actions.cancel,
    confirmLabel: messages.actions.discard,
    message: messages.dialog.unsavedChangesMessage,
    title: messages.dialog.unsavedChangesTitle,
  });
};
