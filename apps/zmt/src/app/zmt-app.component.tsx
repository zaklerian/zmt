import { useMemo } from 'react';
import { createMemoryRouter, RouterProvider } from 'react-router';

import { AppProviders } from './providers';
import { routeConfig } from './router';

export function ZmtApp() {
  const router = useMemo(
    () => createMemoryRouter([...routeConfig], { initialEntries: ['/'] }),
    [],
  );

  return (
    <AppProviders>
      <RouterProvider router={router} />
    </AppProviders>
  );
}
