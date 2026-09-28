import type { HasUnsavedChanges } from '@zmt/renderer/core';
import type { Messages } from '@zmt/shared/i18n';

import { Component, computed, input, model, output } from '@angular/core';
import { form, FormField, readonly } from '@angular/forms/signals';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

import type { ModDescriptorValues } from '../util';

export const EMPTY_DESCRIPTOR: ModDescriptorValues = {
  name: '',
  path: '',
  picture: '',
  supportedVersion: '',
  tags: [],
  version: '',
};

@Component({
  imports: [FormField, MatButtonModule, MatChipsModule, MatFormFieldModule, MatInputModule],
  selector: 'zmt-mod-info-form',
  styleUrl: './mod-info-form.component.scss',
  templateUrl: './mod-info-form.component.html',
})
export class ModInfoFormComponent implements HasUnsavedChanges {
  readonly discard = output();
  readonly messages = input.required<Messages>();
  readonly save = output<ModDescriptorValues>();
  readonly saving = input(false);
  readonly values = model<ModDescriptorValues>(EMPTY_DESCRIPTOR);

  protected readonly descriptorForm = form(this.values, (path) => {
    readonly(path.name);
  });
  readonly dirty = computed(() => this.descriptorForm().dirty());

  protected addTag(event: Event): void {
    event.preventDefault();
    const target = event.target;
    if (target instanceof HTMLInputElement && target.value.trim() !== '') {
      const tag = target.value.trim();
      this.values.update((current) => ({ ...current, tags: [...current.tags, tag] }));
      this.descriptorForm.tags().markAsDirty();
      target.value = '';
    }
  }

  protected onSubmit(event: Event): void {
    event.preventDefault();
    this.save.emit(this.values());
  }
}
