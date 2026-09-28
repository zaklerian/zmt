import { unsavedChangesGuard } from '@zmt/renderer/shell/data-access';

import { ModContentComponent } from './mod-content.component';
import { MOD_CONTENT_ROUTES } from './mod-content.routes';

describe('MOD_CONTENT_ROUTES', () => {
  it('serves the mod content page at the feature root behind the unsaved-changes guard', () => {
    expect(MOD_CONTENT_ROUTES).toEqual([
      { canDeactivate: [unsavedChangesGuard], component: ModContentComponent, path: '' },
    ]);
  });
});
