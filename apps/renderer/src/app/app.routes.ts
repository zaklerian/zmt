import type { Routes } from '@angular/router';

import { ROUTE_PATHS } from '@zmt/renderer/shell/ui';

export const APP_ROUTES: Routes = [
  {
    loadChildren: async () => (await import('@zmt/renderer/home/feature')).HOME_ROUTES,
    path: ROUTE_PATHS.home,
  },
  {
    loadChildren: async () =>
      (await import('@zmt/renderer/mod-content/feature')).MOD_CONTENT_ROUTES,
    path: ROUTE_PATHS.modContent,
  },
  {
    loadChildren: async () => (await import('@zmt/renderer/mod-info/feature')).MOD_INFO_ROUTES,
    path: ROUTE_PATHS.modInfo,
  },
  {
    loadChildren: async () =>
      (await import('@zmt/renderer/app-settings/feature')).FEATURE_NAV_ROUTES,
    path: ROUTE_PATHS.featureNav,
  },
  {
    loadChildren: async () => (await import('@zmt/renderer/tech-tree/feature')).TECH_TREE_ROUTES,
    path: ROUTE_PATHS.techTree,
  },
  {
    loadChildren: async () =>
      (await import('@zmt/renderer/app-settings/feature')).APP_SETTINGS_ROUTES,
    path: ROUTE_PATHS.appSettings,
  },
  { path: '**', redirectTo: ROUTE_PATHS.home },
];
