import type { Messages } from '@zmt/shared/i18n';

import { Component, input, model } from '@angular/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { type MatSelectChange, MatSelectModule } from '@angular/material/select';

@Component({
  imports: [MatFormFieldModule, MatInputModule, MatSelectModule],
  selector: 'zmt-canvas-toolbar',
  styles: `
    .toolbar {
      display: flex;
      gap: 0.5rem;
      align-items: center;
    }
  `,
  template: `
    <div class="toolbar" role="toolbar" [attr.aria-label]="messages().modContent.panelToolbar">
      <mat-form-field appearance="outline" class="search">
        <mat-label>{{ messages().techTree.search }}</mat-label>
        <input matInput type="search" [value]="search()" (input)="onSearchInput($event)" />
      </mat-form-field>
      <mat-form-field appearance="outline" class="categories">
        <mat-label>{{ messages().techTree.categories }}</mat-label>
        <mat-select
          multiple
          [value]="selectedCategories()"
          (selectionChange)="onCategories($event)"
        >
          @for (category of categories(); track category) {
            <mat-option [value]="category">{{ category }}</mat-option>
          }
        </mat-select>
      </mat-form-field>
    </div>
  `,
})
export class CanvasToolbarComponent {
  readonly categories = input.required<readonly string[]>();
  readonly messages = input.required<Messages>();
  readonly search = model('');
  readonly selectedCategories = model<readonly string[]>([]);

  protected onCategories(change: MatSelectChange): void {
    const value: unknown = change.value;
    if (Array.isArray(value)) {
      this.selectedCategories.set(value.filter((entry) => typeof entry === 'string'));
    }
  }

  protected onSearchInput(event: Event): void {
    const target = event.target;
    if (target instanceof HTMLInputElement) {
      this.search.set(target.value);
    }
  }
}
