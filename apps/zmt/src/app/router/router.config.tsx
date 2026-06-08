import type { RouteObject } from 'react-router';

import { ModInfoEditView } from '../../features/mod-info-edit';
import { AppShell, SelectSomethingPlaceholder } from '../shell';

export const routeConfig: readonly RouteObject[] = [
  {
    children: [
      { element: <SelectSomethingPlaceholder />, index: true },
      { element: <ModInfoEditView />, path: 'mod/info' },
    ],
    element: <AppShell />,
    path: '/',
  },
];
