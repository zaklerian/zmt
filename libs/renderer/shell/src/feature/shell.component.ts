import { Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatSidenavModule } from '@angular/material/sidenav';
import { Router, RouterOutlet } from '@angular/router';
import { LOCALES } from '@zmt/shared/i18n';

import { APP_VERSION, I18nStore, WorkspaceStore } from '../data-access';
import {
  AppFooterComponent,
  AppToolbarComponent,
  NAV_ENTRIES,
  NavRailComponent,
  ROUTE_PATHS,
} from '../ui';

@Component({
  imports: [
    AppFooterComponent,
    AppToolbarComponent,
    MatSidenavModule,
    NavRailComponent,
    RouterOutlet,
  ],
  selector: 'zmt-shell',
  styleUrl: './shell.component.scss',
  templateUrl: './shell.component.html',
})
export class ShellComponent {
  private readonly router = inject(Router);
  protected readonly entries = inject(NAV_ENTRIES);
  protected readonly expanded = signal(false);
  protected readonly i18n = inject(I18nStore);
  protected readonly locale = this.i18n.locale;
  protected readonly locales = LOCALES;
  protected readonly version = inject(APP_VERSION);
  protected readonly workspace = inject(WorkspaceStore);

  constructor() {
    this.workspace.folderOpened$.pipe(takeUntilDestroyed()).subscribe(() => {
      void this.router.navigate(['/', ROUTE_PATHS.modContent]);
    });
  }

  protected openSettings(): void {
    void this.router.navigate(['/', ROUTE_PATHS.appSettings]);
  }

  protected toggleNavigation(): void {
    this.expanded.update((expanded) => !expanded);
  }
}
