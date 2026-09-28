import type { Messages } from '@zmt/shared/i18n';

import { Component, computed, input, model } from '@angular/core';
import { type MatButtonToggleChange, MatButtonToggleModule } from '@angular/material/button-toggle';
import { type StructuredView, VIEW_MODES, type ViewMode } from '@zmt/renderer/mod-content/util';

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
      <mat-button-toggle [value]="modes.table" [attr.aria-label]="structuredLabel()">{{
        structuredLabel()
      }}</mat-button-toggle>
      <mat-button-toggle [value]="modes.code" [attr.aria-label]="messages().modContent.codeView">{{
        messages().modContent.codeView
      }}</mat-button-toggle>
    </mat-button-toggle-group>
  `,
})
export class ContentModeToggleComponent {
  readonly messages = input.required<Messages>();
  readonly mode = model<ViewMode>('table');
  readonly structuredView = input<StructuredView>('table');

  protected readonly modes = VIEW_MODES;

  protected readonly structuredLabel = computed(() =>
    this.structuredView() === 'form'
      ? this.messages().modContent.formView
      : this.messages().modContent.tableView,
  );

  protected onChange(change: MatButtonToggleChange): void {
    const value: unknown = change.value;
    if (value === VIEW_MODES.code || value === VIEW_MODES.table) {
      this.mode.set(value);
    }
  }
}
