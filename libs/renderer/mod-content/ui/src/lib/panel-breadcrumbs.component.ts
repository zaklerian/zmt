import type { Messages } from '@zmt/shared/i18n';

import { Component, input } from '@angular/core';

@Component({
  selector: 'zmt-panel-breadcrumbs',
  styles: `
    .trail {
      display: flex;
      gap: 0.5rem;
      margin: 0;
      padding: 0.5rem 1rem;
      list-style: none;
    }
  `,
  template: `
    <nav [attr.aria-label]="messages().modContent.breadcrumbs">
      <ol class="trail">
        <li class="root">{{ rootName() }}</li>
        @for (segment of segments(); track $index) {
          <li class="segment">{{ segment }}</li>
        }
      </ol>
    </nav>
  `,
})
export class PanelBreadcrumbsComponent {
  readonly messages = input.required<Messages>();
  readonly rootName = input.required<string>();
  readonly segments = input.required<readonly string[]>();
}
