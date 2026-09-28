export const ROUTE_PATHS = {
  appSettings: 'settings',
  featureNav: 'features',
  home: '',
  modContent: 'mod-content',
  modInfo: 'mod-info',
  techTree: 'tech-tree',
} as const satisfies Record<string, string>;

export type RoutePath = (typeof ROUTE_PATHS)[keyof typeof ROUTE_PATHS];
