import type { NavEntry } from '@zmt/renderer/shell/ui';

import { ROUTE_PATHS } from '@zmt/renderer/shell/ui';

export const APP_NAV_ENTRIES: readonly NavEntry[] = [
  { icon: 'home', label: 'home', path: ROUTE_PATHS.home },
  { icon: 'folder', label: 'modContent', path: ROUTE_PATHS.modContent },
  { icon: 'info', label: 'modInfo', path: ROUTE_PATHS.modInfo },
  { icon: 'list', label: 'featureNav', path: ROUTE_PATHS.featureNav },
  { icon: 'tree', label: 'techTree', path: ROUTE_PATHS.techTree },
  { icon: 'settings', label: 'appSettings', path: ROUTE_PATHS.appSettings },
];
