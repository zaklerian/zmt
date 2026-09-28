import { inject, Service, type Type } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { pending } from '@zmt/renderer/pending/util';
import { map, type Observable } from 'rxjs';

import { ConfirmDialogComponent } from './confirm-dialog.component';
import {
  type ConfirmDialogOptions,
  type DialogData,
  type FormDialogOptions,
  type HasUnsavedChanges,
  type InfoDialogOptions,
} from './dialog.model';

@Service()
export class DialogService {
  private readonly dialog = inject(MatDialog);

  readonly openForm: <TData, TResult>(
    component: Type<HasUnsavedChanges>,
    options: FormDialogOptions<TData>,
  ) => Observable<TResult | undefined> = () => pending('ZMT-A-5');

  confirm(options: ConfirmDialogOptions): Observable<boolean> {
    return this.open({ kind: 'confirm', options }).pipe(map((result) => result === true));
  }

  info(options: InfoDialogOptions): Observable<void> {
    return this.open({ kind: 'info', options }).pipe(map(() => undefined));
  }

  private open(data: DialogData): Observable<boolean | undefined> {
    return this.dialog
      .open<ConfirmDialogComponent, DialogData, boolean>(ConfirmDialogComponent, { data })
      .afterClosed();
  }
}
