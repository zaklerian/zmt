import { Component, inject, input, model } from '@angular/core';
import { form, FormField } from '@angular/forms/signals';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MESSAGES } from '@zmt/renderer/shell/ui';

@Component({
  imports: [FormField, MatFormFieldModule, MatInputModule, MatSelectModule],
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
        <input matInput type="search" [formField]="searchForm" />
      </mat-form-field>
      <mat-form-field appearance="outline" class="categories">
        <mat-label>{{ messages().techTree.categories }}</mat-label>
        <mat-select multiple [formField]="categoriesForm">
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
  protected readonly messages = inject(MESSAGES);
  readonly search = model('');
  readonly selectedCategories = model<readonly string[]>([]);

  protected readonly categoriesForm = form(this.selectedCategories);
  protected readonly searchForm = form(this.search);
}
