import type { Messages } from '@zmt/shared/i18n';

import { Component, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';

@Component({
  imports: [MatButtonModule],
  selector: 'zmt-no-folder-state',
  template: `
    <section class="empty-state">
      <h3 class="title">{{ messages().modContent.noFolderTitle }}</h3>
      <p class="description">{{ messages().modContent.noFolderDescription }}</p>
      <button matButton="filled" type="button" class="open-folder" (click)="openFolder.emit()">
        {{ messages().shell.openFolder }}
      </button>
    </section>
  `,
})
export class NoFolderStateComponent {
  readonly messages = input.required<Messages>();
  readonly openFolder = output();
}
