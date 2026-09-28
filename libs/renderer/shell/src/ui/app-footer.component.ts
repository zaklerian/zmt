import { Component, inject, input } from '@angular/core';

import { MESSAGES } from './messages.const';

@Component({
  selector: 'zmt-app-footer',
  template: `
    <footer class="footer">
      <span class="version">{{ messages().home.version(version()) }}</span>
    </footer>
  `,
})
export class AppFooterComponent {
  protected readonly messages = inject(MESSAGES);
  readonly version = input.required<string>();
}
