import { inject, Service } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { map, type Observable } from 'rxjs';

import { ConfirmDialogComponent } from './confirm-dialog.component';
import { type ConfirmDialogOptions, type DialogData, type InfoDialogOptions } from './dialog.model';

@Service()
export class DialogService {
  private readonly dialog = inject(MatDialog);

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
