import type { ParserWarning } from '@zmt/renderer/mod-info/util';
import type { Messages } from '@zmt/shared/i18n';

import { Component, input } from '@angular/core';

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
  readonly messages = input.required<Messages>();
  readonly warnings = input.required<readonly ParserWarning[]>();
}
