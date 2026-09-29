import { Component, inject, model } from '@angular/core';
import { form, FormField } from '@angular/forms/signals';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MESSAGES } from '@zmt/renderer/shell/ui';

@Component({
  imports: [FormField, MatSlideToggleModule],
  selector: 'zmt-file-display-form',
  template: `
    <fieldset class="file-display">
      <legend>{{ messages().appSettings.fileDisplay }}</legend>
      <mat-slide-toggle class="hide-unsupported" [formField]="displayForm">
        {{ messages().appSettings.hideUnsupportedFiles }}
      </mat-slide-toggle>
    </fieldset>
  `,
})
export class FileDisplayFormComponent {
  readonly hideUnsupportedFiles = model(false);
  protected readonly messages = inject(MESSAGES);

  protected readonly displayForm = form(this.hideUnsupportedFiles);
}
