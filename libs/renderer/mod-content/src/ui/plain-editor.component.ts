import type { IpcError } from '@zmt/contracts';

import { Component, inject, input, model, output } from '@angular/core';
import { form, FormField, readonly } from '@angular/forms/signals';
import { MatButtonModule } from '@angular/material/button';
import { MESSAGES } from '@zmt/renderer/shell/ui';

@Component({
  imports: [FormField, MatButtonModule],
  selector: 'zmt-plain-editor',
  styleUrl: './plain-editor.component.scss',
  templateUrl: './plain-editor.component.html',
})
export class PlainEditorComponent {
  readonly discard = output();
  readonly dirty = input(false);
  protected readonly messages = inject(MESSAGES);
  readonly save = output();
  readonly saveError = input<IpcError | null>(null);
  readonly saving = input(false);
  readonly text = model.required<string>();
  readonly writable = input(false);

  protected readonly editorForm = form(this.text, (path) => {
    readonly(path, { when: () => !this.writable() });
  });
}
