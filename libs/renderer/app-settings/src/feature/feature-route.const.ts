import type { FeatureId } from '@zmt/contracts';
import type { RoutePath } from '@zmt/renderer/shell/ui';

import { ROUTE_PATHS } from '@zmt/renderer/shell/ui';

export const FEATURE_ROUTES: Readonly<Partial<Record<FeatureId, RoutePath>>> = {
  aircraft: ROUTE_PATHS.techTree,
};
