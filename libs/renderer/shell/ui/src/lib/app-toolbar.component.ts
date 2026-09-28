import { Component, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { type MatButtonToggleChange, MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatToolbarModule } from '@angular/material/toolbar';
import { isLocale, type Locale, type Messages } from '@zmt/shared/i18n';

import { NavIconComponent } from './nav-icon.component';

@Component({
  imports: [MatButtonModule, MatButtonToggleModule, MatToolbarModule, NavIconComponent],
  selector: 'zmt-app-toolbar',
  styleUrl: './app-toolbar.component.scss',
  templateUrl: './app-toolbar.component.html',
})
export class AppToolbarComponent {
  readonly expanded = input(false);
  readonly hasRoot = input(false);
  readonly locale = input.required<Locale>();
  readonly localeChange = output<Locale>();
  readonly locales = input.required<readonly Locale[]>();
  readonly messages = input.required<Messages>();
  readonly openFolder = output();
  readonly openSettings = output();
  readonly toggleNavigation = output();

  protected selectLocale(change: MatButtonToggleChange): void {
    const value: unknown = change.value;
    if (isLocale(value)) {
      this.localeChange.emit(value);
    }
  }
}
