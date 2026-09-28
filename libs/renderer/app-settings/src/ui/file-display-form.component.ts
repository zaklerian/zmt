import type { Messages } from '@zmt/shared/i18n';

import { Component, input, model } from '@angular/core';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';

@Component({
  imports: [MatSlideToggleModule],
  selector: 'zmt-file-display-form',
  template: `
    <fieldset class="file-display">
      <legend>{{ messages().appSettings.fileDisplay }}</legend>
      <mat-slide-toggle
        class="hide-unsupported"
        [checked]="hideUnsupportedFiles()"
        (change)="hideUnsupportedFiles.set($event.checked)"
      >
        {{ messages().appSettings.hideUnsupportedFiles }}
      </mat-slide-toggle>
    </fieldset>
  `,
})
export class FileDisplayFormComponent {
  readonly hideUnsupportedFiles = model(false);
  readonly messages = input.required<Messages>();
}
