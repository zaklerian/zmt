import type { Routes } from '@angular/router';

import { unsavedChangesGuard } from '@zmt/renderer/shell/data-access';

import { AppSettingsComponent } from './app-settings.component';

export const APP_SETTINGS_ROUTES: Routes = [
  { canDeactivate: [unsavedChangesGuard], component: AppSettingsComponent, path: '' },
];
