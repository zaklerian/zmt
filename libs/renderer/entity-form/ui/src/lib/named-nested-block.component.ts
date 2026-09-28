import type { EntityFormValues, NamedNestedBlock } from '@zmt/renderer/entity-form/util';
import type { Messages } from '@zmt/shared/i18n';

import { Component, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

import { ListOfScalarsBlockComponent } from './list-of-scalars-block.component';
import { inputValue } from './property-bag-block.component';

export const KEYED_MAP_ENTRIES_SUFFIX = '__entries';

@Component({
  imports: [ListOfScalarsBlockComponent, MatButtonModule, MatFormFieldModule, MatInputModule],
  selector: 'zmt-named-nested-block',
  styleUrl: './named-nested-block.component.scss',
  templateUrl: './named-nested-block.component.html',
})
export class NamedNestedBlockComponent {
  readonly block = input.required<NamedNestedBlock>();
  readonly messages = input.required<Messages>();
  readonly patch = output<EntityFormValues>();

  protected addEntry(): void {
    this.patch.emit({
      [`${this.block().name}${KEYED_MAP_ENTRIES_SUFFIX}`]: [{ key: '', rows: [] }],
    });
  }

  protected addRow(): void {
    this.patch.emit({ [this.block().name]: [...this.block().rows, { key: '', value: '' }] });
  }

  protected onRowInput(index: number, part: 'key' | 'value', event: Event): void {
    const value = inputValue(event);
    this.patch.emit({
      [this.block().name]: this.block().rows.map((row, position) =>
        position === index ? { ...row, [part]: value } : row,
      ),
    });
  }

  protected removeRow(index: number): void {
    this.patch.emit({
      [this.block().name]: this.block().rows.filter((row, position) => position !== index),
    });
  }
}
