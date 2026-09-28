import type { Routes } from '@angular/router';

import { unsavedChangesGuard } from '@zmt/renderer/shell/data-access';

import { ModContentComponent } from './mod-content.component';

export const MOD_CONTENT_ROUTES: Routes = [
  { canDeactivate: [unsavedChangesGuard], component: ModContentComponent, path: '' },
];
