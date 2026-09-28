import { unsavedChangesGuard } from '@zmt/renderer/shell/data-access';

import { ModInfoComponent } from './mod-info.component';
import { MOD_INFO_ROUTES } from './mod-info.routes';

describe('MOD_INFO_ROUTES', () => {
  it('serves the descriptor page at the feature root behind the unsaved-changes guard', () => {
    expect(MOD_INFO_ROUTES).toEqual([
      { canDeactivate: [unsavedChangesGuard], component: ModInfoComponent, path: '' },
    ]);
  });
});
