import { app, BrowserWindow } from 'electron';

import { createMainWindow } from './factories';
import { initializePlugins } from './plugins';
import {
  initializeDefaultRoot,
  installContentSecurityPolicy,
  registerAppLifecycle,
  registerFsHandlers,
  registerPluginsHandlers,
  registerPreferencesHandlers,
  registerSystemHandlers,
} from './setup';

async function bootstrap(): Promise<void> {
  registerSystemHandlers();
  registerFsHandlers();
  registerPreferencesHandlers();
  initializePlugins();
  registerPluginsHandlers();
  installContentSecurityPolicy();
  await initializeDefaultRoot();
  createMainWindow();
}

app
  .whenReady()
  .then(() => {
    registerAppLifecycle({
      onActivate: () => {
        if (BrowserWindow.getAllWindows().length === 0) {
          createMainWindow();
        }
      },
    });

    return bootstrap();
  })
  .catch(() => {
    app.quit();
  });
