import { Component, inject, signal } from '@angular/core';
import { MatSidenavModule } from '@angular/material/sidenav';
import { Router, RouterOutlet } from '@angular/router';
import { APP_VERSION } from '@zmt/renderer/app-info/data-access';
import { I18nStore } from '@zmt/renderer/i18n/data-access';
import {
  AppFooterComponent,
  AppToolbarComponent,
  NAV_ENTRIES,
  NavRailComponent,
  ROUTE_PATHS,
} from '@zmt/renderer/shell/ui';
import { WorkspaceStore } from '@zmt/renderer/workspace/data-access';
import { LOCALES } from '@zmt/shared/i18n';

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
  protected readonly messages = this.i18n.messages;
  protected readonly version = inject(APP_VERSION);
  protected readonly workspace = inject(WorkspaceStore);

  protected openSettings(): void {
    void this.router.navigate(['/', ROUTE_PATHS.appSettings]);
  }

  protected toggleNavigation(): void {
    this.expanded.update((expanded) => !expanded);
  }
}
