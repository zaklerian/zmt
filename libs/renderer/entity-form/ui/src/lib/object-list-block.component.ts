import type { EntityFormValues, ObjectListBlock } from '@zmt/renderer/entity-form/util';
import type { Messages } from '@zmt/shared/i18n';

import { Component, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

import { inputValue } from './property-bag-block.component';

type Item = Readonly<Record<string, unknown>>;

@Component({
  imports: [MatButtonModule, MatFormFieldModule, MatInputModule],
  selector: 'zmt-object-list-block',
  styleUrl: './object-list-block.component.scss',
  templateUrl: './object-list-block.component.html',
})
export class ObjectListBlockComponent {
  readonly block = input.required<ObjectListBlock>();
  readonly messages = input.required<Messages>();
  readonly patch = output<EntityFormValues>();

  protected addItem(): void {
    const blank: Item = Object.fromEntries(
      this.block().fields.map((field) => [field.spec.name, '']),
    );
    this.patch.emit({ [this.block().name]: [...this.block().items, blank] });
  }

  protected onFieldInput(index: number, name: string, event: Event): void {
    const value = inputValue(event);
    this.patch.emit({
      [this.block().name]: this.block().items.map((item, position) =>
        position === index ? { ...item, [name]: value } : item,
      ),
    });
  }

  protected removeItem(index: number): void {
    this.patch.emit({
      [this.block().name]: this.block().items.filter((item, position) => position !== index),
    });
  }

  protected valueOf(item: Item, name: string): string {
    const value = item[name];
    return typeof value === 'string' ? value : '';
  }
}
