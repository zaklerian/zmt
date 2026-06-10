import { app, BrowserWindow } from 'electron';

import { createMainWindow } from './factories';
import { initializePlugins } from './plugins';
import {
  initializeDefaultRoot,
  installContentSecurityPolicy,
  registerAppLifecycle,
  registerEntityHandlers,
  registerEquipmentHandlers,
  registerFsHandlers,
  registerModuleHandlers,
  registerPluginsHandlers,
  registerPreferencesHandlers,
  registerSystemHandlers,
  registerWorkspaceHandlers,
} from './setup';
import { workspaceStoreService } from './workspace';

async function bootstrap(): Promise<void> {
  registerSystemHandlers();
  registerEntityHandlers();
  registerEquipmentHandlers();
  registerFsHandlers();
  registerModuleHandlers();
  registerPreferencesHandlers();
  registerWorkspaceHandlers();
  initializePlugins();
  registerPluginsHandlers();
  installContentSecurityPolicy();
  await workspaceStoreService.load();
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
