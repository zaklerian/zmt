import { TechTreeComponent } from './tech-tree.component';
import { TECH_TREE_ROUTES } from './tech-tree.routes';

describe('TECH_TREE_ROUTES', () => {
  it('serves the canvas at the feature root', () => {
    expect(TECH_TREE_ROUTES).toEqual([{ component: TechTreeComponent, path: '' }]);
  });
});
