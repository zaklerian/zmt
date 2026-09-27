import { Component, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { type MatButtonToggleChange, MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatListModule } from '@angular/material/list';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { RouterOutlet } from '@angular/router';
import { I18nStore } from '@zmt/renderer/i18n/data-access';
import { isLocale, LOCALES } from '@zmt/shared/i18n';

@Component({
  imports: [
    MatButtonModule,
    MatButtonToggleModule,
    MatListModule,
    MatSidenavModule,
    MatToolbarModule,
    RouterOutlet,
  ],
  selector: 'zmt-shell',
  styleUrl: './shell.component.scss',
  templateUrl: './shell.component.html',
})
export class ShellComponent {
  protected readonly expanded = signal(false);
  protected readonly locales = LOCALES;
  private readonly i18n = inject(I18nStore);
  protected readonly locale = this.i18n.locale;
  protected readonly messages = this.i18n.messages;

  protected selectLocale(change: MatButtonToggleChange): void {
    const value: unknown = change.value;
    if (isLocale(value)) {
      this.i18n.setLocale(value);
    }
  }

  protected toggleNavigation(): void {
    this.expanded.update((expanded) => !expanded);
  }
}
