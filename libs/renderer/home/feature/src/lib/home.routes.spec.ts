import { HomeComponent } from './home.component';
import { HOME_ROUTES } from './home.routes';

describe('HOME_ROUTES', () => {
  it('serves the home page at the feature root', () => {
    expect(HOME_ROUTES).toEqual([{ component: HomeComponent, path: '' }]);
  });
});
