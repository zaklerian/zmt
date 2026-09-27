import { Component, inject } from '@angular/core';
import { APP_VERSION } from '@zmt/renderer/app-info/data-access';
import { I18nStore } from '@zmt/renderer/i18n/data-access';

@Component({
  selector: 'zmt-home',
  styleUrl: './home.component.scss',
  templateUrl: './home.component.html',
})
export class HomeComponent {
  protected readonly messages = inject(I18nStore).messages;
  protected readonly version = inject(APP_VERSION);
}
