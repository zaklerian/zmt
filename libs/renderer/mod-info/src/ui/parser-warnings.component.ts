import { Component, inject, input } from '@angular/core';
import { MESSAGES } from '@zmt/renderer/shell/ui';

import type { ParserWarning } from '../util';

@Component({
  selector: 'zmt-parser-warnings',
  template: `
    @if (warnings().length > 0) {
      <details class="warnings">
        <summary>{{ messages().modInfo.parserWarnings(warnings().length) }}</summary>
        <ul>
          @for (warning of warnings(); track $index) {
            <li>
              <span class="message">{{ warning.message }}</span>
              <span class="offset">{{
                messages().modInfo.parserOffset(warning.from, warning.to)
              }}</span>
            </li>
          }
        </ul>
      </details>
    }
  `,
})
export class ParserWarningsComponent {
  protected readonly messages = inject(MESSAGES);
  readonly warnings = input.required<readonly ParserWarning[]>();
}
