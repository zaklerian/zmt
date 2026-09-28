import type { Messages } from '@zmt/shared/i18n';

import type { NavIcon } from './nav-icon.const';
import type { RoutePath } from './route-path.const';

export type NavLabel = keyof Messages['nav'];

export interface NavEntry {
  readonly icon: NavIcon;
  readonly label: NavLabel;
  readonly path: RoutePath;
}
