import type { FeatureContribution } from '@zmt/contracts';
import type { Messages } from '@zmt/shared/i18n';

import { Component, input } from '@angular/core';

@Component({
  selector: 'zmt-feature-tree-placeholder',
  template: `
    <section class="placeholder">
      @if (feature(); as active) {
        <h3 class="label">{{ active.label }}</h3>
        <p class="title">{{ messages().featureNav.treePlaceholderTitle }}</p>
        <p class="caption">{{ messages().featureNav.treePlaceholderCaption }}</p>
      } @else {
        <p class="no-selection">{{ messages().featureNav.noSelection }}</p>
      }
    </section>
  `,
})
export class FeatureTreePlaceholderComponent {
  readonly feature = input<FeatureContribution | null>(null);
  readonly messages = input.required<Messages>();
}
