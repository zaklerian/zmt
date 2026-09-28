import { unsavedChangesGuard } from '@zmt/renderer/shell/data-access';

import { AppSettingsComponent } from './app-settings.component';
import { APP_SETTINGS_ROUTES } from './app-settings.routes';

describe('APP_SETTINGS_ROUTES', () => {
  it('serves the settings page at the feature root behind the unsaved-changes guard', () => {
    expect(APP_SETTINGS_ROUTES).toEqual([
      { canDeactivate: [unsavedChangesGuard], component: AppSettingsComponent, path: '' },
    ]);
  });
});
