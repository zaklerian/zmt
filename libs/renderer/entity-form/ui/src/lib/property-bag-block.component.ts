import type {
  EntityFormRow,
  EntityFormValues,
  PropertyBagBlock,
} from '@zmt/renderer/entity-form/util';
import type { Messages } from '@zmt/shared/i18n';

import { Component, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

export function inputValue(event: Event): string {
  const target = event.target;
  return target instanceof HTMLInputElement ? target.value : '';
}

@Component({
  imports: [MatButtonModule, MatFormFieldModule, MatInputModule],
  selector: 'zmt-property-bag-block',
  styleUrl: './property-bag-block.component.scss',
  templateUrl: './property-bag-block.component.html',
})
export class PropertyBagBlockComponent {
  readonly block = input.required<PropertyBagBlock>();
  readonly messages = input.required<Messages>();
  readonly patch = output<EntityFormValues>();

  protected addRow(name: string): void {
    this.patch.emit({ [name]: [...this.rows(), { key: '', value: '' }] });
  }

  protected onFieldInput(name: string, event: Event): void {
    this.patch.emit({ [name]: inputValue(event) });
  }

  protected onRowInput(name: string, index: number, part: 'key' | 'value', event: Event): void {
    const value = inputValue(event);
    this.patch.emit({
      [name]: this.rows().map((row, position) =>
        position === index ? { ...row, [part]: value } : row,
      ),
    });
  }

  protected removeRow(name: string, index: number): void {
    this.patch.emit({ [name]: this.rows().filter((row, position) => position !== index) });
  }

  private rows(): readonly EntityFormRow[] {
    const members = this.block().members;
    return members.mode === 'open' ? members.rows : [];
  }
}
