import { FeatureNavComponent } from './feature-nav.component';
import { FEATURE_NAV_ROUTES } from './feature-nav.routes';

describe('FEATURE_NAV_ROUTES', () => {
  it('serves the feature list at the feature root', () => {
    expect(FEATURE_NAV_ROUTES).toEqual([{ component: FeatureNavComponent, path: '' }]);
  });
});
