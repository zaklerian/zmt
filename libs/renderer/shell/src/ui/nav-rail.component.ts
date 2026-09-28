import { Component, inject, input } from '@angular/core';
import { MatListModule } from '@angular/material/list';
import { RouterLink, RouterLinkActive } from '@angular/router';

import type { NavEntry } from './navigation.model';

import { MESSAGES } from './messages.const';
import { NavIconComponent } from './nav-icon.component';

@Component({
  imports: [MatListModule, NavIconComponent, RouterLink, RouterLinkActive],
  selector: 'zmt-nav-rail',
  styleUrl: './nav-rail.component.scss',
  templateUrl: './nav-rail.component.html',
})
export class NavRailComponent {
  readonly entries = input.required<readonly NavEntry[]>();
  readonly expanded = input(false);
  protected readonly messages = inject(MESSAGES);
}
