import type { FeatureContribution, FeatureId } from '@zmt/contracts';
import type { Messages } from '@zmt/shared/i18n';

import { Component, input, output } from '@angular/core';
import { MatListModule } from '@angular/material/list';

@Component({
  imports: [MatListModule],
  selector: 'zmt-feature-nav-list',
  template: `
    <mat-nav-list class="features" [attr.aria-label]="messages().featureNav.list">
      @for (feature of features(); track feature.featureId) {
        <button
          mat-list-item
          type="button"
          class="feature"
          [activated]="feature.featureId === activeFeatureId()"
          (click)="selectFeature.emit(feature.featureId)"
        >
          <span matListItemTitle>{{ feature.label }}</span>
        </button>
      } @empty {
        <p class="empty">{{ messages().featureNav.noFeatures }}</p>
      }
    </mat-nav-list>
  `,
})
export class FeatureNavListComponent {
  readonly activeFeatureId = input<FeatureId | null>(null);
  readonly features = input.required<readonly FeatureContribution[]>();
  readonly messages = input.required<Messages>();
  readonly selectFeature = output<FeatureId>();
}
