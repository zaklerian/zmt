import type { Signal } from '@angular/core';

export interface ConfirmDialogOptions {
  readonly cancelLabel: string;
  readonly confirmLabel: string;
  readonly message: string;
  readonly title: string;
}

export interface InfoDialogOptions {
  readonly confirmLabel: string;
  readonly message: string;
  readonly title: string;
}

export type DialogData =
  | { readonly kind: 'confirm'; readonly options: ConfirmDialogOptions }
  | { readonly kind: 'info'; readonly options: InfoDialogOptions };

export interface HasUnsavedChanges {
  readonly dirty: Signal<boolean>;
}
