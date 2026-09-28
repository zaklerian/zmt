import { Component, inject, model } from '@angular/core';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MESSAGES } from '@zmt/renderer/shell/ui';

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
  protected readonly messages = inject(MESSAGES);
}
