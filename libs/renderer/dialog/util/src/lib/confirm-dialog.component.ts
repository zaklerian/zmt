import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';

import type { DialogData } from './dialog.model';

@Component({
  imports: [MatButtonModule, MatDialogModule],
  selector: 'zmt-confirm-dialog',
  templateUrl: './confirm-dialog.component.html',
})
export class ConfirmDialogComponent {
  protected readonly data = inject<DialogData>(MAT_DIALOG_DATA);
}
