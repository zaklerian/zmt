import type { Routes } from '@angular/router';

import { unsavedChangesGuard } from '@zmt/renderer/shell/data-access';

import { ModInfoComponent } from './mod-info.component';

export const MOD_INFO_ROUTES: Routes = [
  { canDeactivate: [unsavedChangesGuard], component: ModInfoComponent, path: '' },
];
