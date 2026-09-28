import type { Messages } from '@zmt/shared/i18n';

import { Component, input } from '@angular/core';

@Component({
  selector: 'zmt-content-placeholder',
  template: `<p class="placeholder">{{ messages().modContent.selectSomething }}</p>`,
})
export class ContentPlaceholderComponent {
  readonly messages = input.required<Messages>();
}
