import { Component, computed, input } from '@angular/core';

import { NAV_ICONS, type NavIcon } from './nav-icon.const';

@Component({
  selector: 'zmt-nav-icon',
  template: `
    <svg class="icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path [attr.d]="path()" />
    </svg>
  `,
})
export class NavIconComponent {
  readonly icon = input.required<NavIcon>();
  protected readonly path = computed(() => NAV_ICONS[this.icon()]);
}
