import type { EntityFormValues, ListOfScalarsBlock } from '@zmt/renderer/entity-form/util';
import type { Messages } from '@zmt/shared/i18n';

import { Component, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

@Component({
  imports: [MatButtonModule, MatChipsModule, MatFormFieldModule, MatInputModule],
  selector: 'zmt-list-of-scalars-block',
  styles: `
    .block {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      border: 1px solid var(--mat-sys-outline-variant);
      border-radius: 4px;
    }
  `,
  template: `
    <fieldset class="block">
      <legend>{{ block().label }}</legend>
      <mat-chip-set [attr.aria-label]="block().label">
        @for (value of block().values; track $index) {
          <mat-chip [removable]="true" (removed)="remove($index)">{{ value }}</mat-chip>
        }
      </mat-chip-set>
      <mat-form-field appearance="outline">
        <mat-label>{{ block().placeholder ?? messages().entityForm.addField }}</mat-label>
        <input matInput class="entry" (keydown.enter)="add($event)" />
      </mat-form-field>
    </fieldset>
  `,
})
export class ListOfScalarsBlockComponent {
  readonly block = input.required<ListOfScalarsBlock>();
  readonly messages = input.required<Messages>();
  readonly patch = output<EntityFormValues>();

  protected add(event: Event): void {
    event.preventDefault();
    const target = event.target;
    if (target instanceof HTMLInputElement && target.value.trim() !== '') {
      this.patch.emit({ [this.block().name]: [...this.block().values, target.value.trim()] });
      target.value = '';
    }
  }

  protected remove(index: number): void {
    this.patch.emit({
      [this.block().name]: this.block().values.filter((value, position) => position !== index),
    });
  }
}
