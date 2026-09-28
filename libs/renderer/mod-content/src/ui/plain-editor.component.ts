import type { IpcError } from '@zmt/contracts';
import type { Messages } from '@zmt/shared/i18n';

import { Component, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';

@Component({
  imports: [MatButtonModule],
  selector: 'zmt-plain-editor',
  styleUrl: './plain-editor.component.scss',
  templateUrl: './plain-editor.component.html',
})
export class PlainEditorComponent {
  readonly discard = output();
  readonly dirty = input(false);
  readonly messages = input.required<Messages>();
  readonly save = output();
  readonly saveError = input<IpcError | null>(null);
  readonly saving = input(false);
  readonly text = input.required<string>();
  readonly textChange = output<string>();
  readonly writable = input(false);

  protected onInput(event: Event): void {
    const target = event.target;
    if (target instanceof HTMLTextAreaElement) {
      this.textChange.emit(target.value);
    }
  }
}
