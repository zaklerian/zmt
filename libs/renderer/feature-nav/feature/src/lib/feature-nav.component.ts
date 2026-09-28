import type { FeatureId } from '@zmt/contracts';

import { Component, computed, inject } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { AppSettingsStore } from '@zmt/renderer/app-settings/data-access';
import { errorOf } from '@zmt/renderer/async-status/util';
import { FeatureNavStore } from '@zmt/renderer/feature-nav/data-access';
import {
  FeatureNavListComponent,
  FeatureTreePlaceholderComponent,
} from '@zmt/renderer/feature-nav/ui';
import { I18nStore } from '@zmt/renderer/i18n/data-access';
import { map } from 'rxjs';

import { FEATURE_ROUTES } from './feature-route.const';

@Component({
  imports: [FeatureNavListComponent, FeatureTreePlaceholderComponent],
  selector: 'zmt-feature-nav',
  styles: `
    .title {
      margin: 0 0 1rem;
      font: var(--mat-sys-headline-small);
    }

    .layout {
      display: grid;
      grid-template-columns: minmax(14rem, 20rem) 1fr;
      gap: 1rem;
    }

    .error {
      margin: 0 0 1rem;
      color: var(--mat-sys-error);
    }
  `,
  template: `
    <h2 class="title">{{ messages().featureNav.title }}</h2>
    @if (loadError(); as error) {
      <p class="error" role="alert">
        {{ messages().featureNav.loadFailed }} {{ messages().errors[error.code] }}
      </p>
    }
    <div class="layout">
      <zmt-feature-nav-list
        [activeFeatureId]="store.activeFeatureId()"
        [features]="store.features()"
        [messages]="messages()"
        (selectFeature)="onSelect($event)"
      />
      <zmt-feature-tree-placeholder [feature]="store.activeFeature()" [messages]="messages()" />
    </div>
  `,
})
export class FeatureNavComponent {
  private readonly appSettings = inject(AppSettingsStore);
  private readonly router = inject(Router);
  protected readonly messages = inject(I18nStore).messages;
  protected readonly store = inject(FeatureNavStore);

  protected readonly loadError = computed(() => errorOf(this.store.status()));

  constructor() {
    this.store.load(toObservable(this.appSettings.featureToggles).pipe(map(() => undefined)));
  }

  protected onSelect(featureId: FeatureId): void {
    this.store.select(featureId);
    const path = FEATURE_ROUTES[featureId];
    if (path !== undefined) {
      void this.router.navigate(['/', path]);
    }
  }
}
