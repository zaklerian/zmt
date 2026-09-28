import type { HasUnsavedChanges } from '@zmt/renderer/dialog/util';
import type { EntityFormModel, EntityFormValues } from '@zmt/renderer/entity-form/util';
import type { Messages } from '@zmt/shared/i18n';

import { Component, input, model, output, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { blockKey } from '@zmt/renderer/entity-form/util';

import { ListOfScalarsBlockComponent } from './list-of-scalars-block.component';
import { NamedNestedBlockComponent } from './named-nested-block.component';
import { ObjectListBlockComponent } from './object-list-block.component';
import { PropertyBagBlockComponent } from './property-bag-block.component';

export const FORM_CHROMES = {
  dialog: 'dialog',
  inline: 'inline',
} as const satisfies Record<string, string>;

export type FormChrome = (typeof FORM_CHROMES)[keyof typeof FORM_CHROMES];

@Component({
  imports: [
    ListOfScalarsBlockComponent,
    MatButtonModule,
    NamedNestedBlockComponent,
    ObjectListBlockComponent,
    PropertyBagBlockComponent,
  ],
  selector: 'zmt-entity-form-shell',
  styleUrl: './entity-form-shell.component.scss',
  templateUrl: './entity-form-shell.component.html',
})
export class EntityFormShellComponent implements HasUnsavedChanges {
  readonly chrome = input<FormChrome>('inline');
  readonly discard = output();
  readonly dismiss = output();
  readonly messages = input.required<Messages>();
  readonly model = input.required<EntityFormModel>();
  readonly save = output<EntityFormValues>();
  readonly saving = input(false);
  readonly values = model<EntityFormValues>({});

  private readonly dirtyState = signal(false);
  readonly dirty = this.dirtyState.asReadonly();

  protected readonly keyOf = blockKey;

  protected applyPatch(patch: EntityFormValues): void {
    this.values.update((current) => ({ ...current, ...patch }));
    this.dirtyState.set(true);
  }

  protected onSubmit(event: Event): void {
    event.preventDefault();
    this.save.emit(this.values());
  }
}
