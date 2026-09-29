import { Component, inject, input, model, output, signal } from '@angular/core';
import { form, FormField, readonly } from '@angular/forms/signals';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MESSAGES } from '@zmt/renderer/shell/ui';

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
export class ModInfoFormComponent {
  readonly dirty = input(false);
  readonly discard = output();
  protected readonly messages = inject(MESSAGES);
  readonly save = output<ModDescriptorValues>();
  readonly saving = input(false);
  readonly values = model<ModDescriptorValues>(EMPTY_DESCRIPTOR);

  protected readonly descriptorForm = form(this.values, (path) => {
    readonly(path.name);
  });
  protected readonly tagDraft = signal('');
  protected readonly tagForm = form(this.tagDraft);

  protected addTag(event: Event): void {
    event.preventDefault();
    const tag = this.tagDraft().trim();
    if (tag !== '') {
      this.descriptorForm.tags().value.update((tags) => [...tags, tag]);
      this.tagForm().reset('');
    }
  }

  protected onSubmit(event: Event): void {
    event.preventDefault();
    this.save.emit(this.values());
  }
}
