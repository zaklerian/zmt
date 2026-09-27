import type { Routes } from '@angular/router';

export const APP_ROUTES: Routes = [
  {
    loadChildren: async () => (await import('@zmt/renderer/home/feature')).HOME_ROUTES,
    path: '',
  },
  { path: '**', redirectTo: '' },
];
