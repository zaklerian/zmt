import type { Messages } from '@zmt/shared/i18n';

import { Component, input } from '@angular/core';

@Component({
  selector: 'zmt-app-footer',
  template: `
    <footer class="footer">
      <span class="version">{{ messages().home.version(version()) }}</span>
    </footer>
  `,
})
export class AppFooterComponent {
  readonly messages = input.required<Messages>();
  readonly version = input.required<string>();
}
