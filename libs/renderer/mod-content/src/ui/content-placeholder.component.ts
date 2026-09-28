import { Component, inject } from '@angular/core';
import { MESSAGES } from '@zmt/renderer/shell/ui';

@Component({
  selector: 'zmt-content-placeholder',
  template: `<p class="placeholder">{{ messages().modContent.selectSomething }}</p>`,
})
export class ContentPlaceholderComponent {
  protected readonly messages = inject(MESSAGES);
}
