import {
  type ApplicationConfig,
  type EnvironmentProviders,
  inject,
  isDevMode,
  provideBrowserGlobalErrorListeners,
  provideCheckNoChangesConfig,
  provideZonelessChangeDetection,
} from '@angular/core';
import { provideRouter } from '@angular/router';
import { APP_VERSION, I18nStore } from '@zmt/renderer/shell/data-access';
import { MESSAGES, NAV_ENTRIES } from '@zmt/renderer/shell/ui';

import { version } from '../../../../package.json';
import { APP_NAV_ENTRIES } from './app-navigation.const';
import { APP_ROUTES } from './app.routes';

export const DEV_PROVIDERS: readonly EnvironmentProviders[] = [
  provideCheckNoChangesConfig({ exhaustive: true }),
];

export function modeProviders(devMode: boolean): readonly EnvironmentProviders[] {
  return devMode ? DEV_PROVIDERS : [];
}

export const APP_CONFIG: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    provideRouter(APP_ROUTES),
    { provide: APP_VERSION, useValue: version },
    { provide: NAV_ENTRIES, useValue: APP_NAV_ENTRIES },
    { provide: MESSAGES, useFactory: () => inject(I18nStore).messages },
    ...modeProviders(isDevMode()),
  ],
};
