import type { FeatureContribution } from '@zmt/contracts';

import { Component, inject, input } from '@angular/core';
import { MESSAGES } from '@zmt/renderer/shell/ui';

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
  protected readonly messages = inject(MESSAGES);
}
