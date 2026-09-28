import { inject, Service, type Type } from '@angular/core';
import { MatDialog, type MatDialogRef } from '@angular/material/dialog';
import { filter, map, merge, type Observable, of, switchMap, take, takeUntil } from 'rxjs';

import { ConfirmDialogComponent } from './confirm-dialog.component';
import {
  type ConfirmDialogOptions,
  type DialogData,
  type FormDialogOptions,
  type HasUnsavedChanges,
  type InfoDialogOptions,
} from './dialog.model';

export const ESCAPE_KEY = 'Escape';

@Service()
export class DialogService {
  private readonly dialog = inject(MatDialog);

  confirm(options: ConfirmDialogOptions): Observable<boolean> {
    return this.open({ kind: 'confirm', options }).pipe(map((result) => result === true));
  }

  info(options: InfoDialogOptions): Observable<void> {
    return this.open({ kind: 'info', options }).pipe(map(() => undefined));
  }

  openForm<TData, TResult>(
    component: Type<HasUnsavedChanges>,
    options: FormDialogOptions<TData>,
  ): Observable<TResult | undefined> {
    const ref: MatDialogRef<HasUnsavedChanges, TResult> = this.dialog.open<
      HasUnsavedChanges,
      TData,
      TResult
    >(component, { data: options.data, disableClose: true });
    const dismissals = merge(
      ref.backdropClick(),
      ref.keydownEvents().pipe(filter((event) => event.key === ESCAPE_KEY)),
    );
    dismissals
      .pipe(
        switchMap(() => this.confirmDiscard(ref.componentInstance, options.discard)),
        filter((discard) => discard),
        take(1),
        takeUntil(ref.afterClosed()),
      )
      .subscribe(() => {
        ref.close();
      });
    return ref.afterClosed();
  }

  private confirmDiscard(
    instance: HasUnsavedChanges,
    options: ConfirmDialogOptions,
  ): Observable<boolean> {
    return instance.dirty() ? this.confirm(options) : of(true);
  }

  private open(data: DialogData): Observable<boolean | undefined> {
    return this.dialog
      .open<ConfirmDialogComponent, DialogData, boolean>(ConfirmDialogComponent, { data })
      .afterClosed();
  }
}
