import { Component, inject, model } from '@angular/core';
import { type MatButtonToggleChange, MatButtonToggleModule } from '@angular/material/button-toggle';
import { MESSAGES } from '@zmt/renderer/shell/ui';

import { VIEW_MODES, type ViewMode } from '../util';

@Component({
  imports: [MatButtonToggleModule],
  selector: 'zmt-content-mode-toggle',
  template: `
    <mat-button-toggle-group
      class="mode-toggle"
      hideSingleSelectionIndicator
      [attr.aria-label]="messages().modContent.panelToolbar"
      [value]="mode()"
      (change)="onChange($event)"
    >
      <mat-button-toggle [value]="modes.table" [attr.aria-label]="messages().modContent.formView">{{
        messages().modContent.formView
      }}</mat-button-toggle>
      <mat-button-toggle [value]="modes.code" [attr.aria-label]="messages().modContent.codeView">{{
        messages().modContent.codeView
      }}</mat-button-toggle>
    </mat-button-toggle-group>
  `,
})
export class ContentModeToggleComponent {
  protected readonly messages = inject(MESSAGES);
  readonly mode = model<ViewMode>('table');

  protected readonly modes = VIEW_MODES;

  protected onChange(change: MatButtonToggleChange): void {
    const value: unknown = change.value;
    if (value === VIEW_MODES.code || value === VIEW_MODES.table) {
      this.mode.set(value);
    }
  }
}
