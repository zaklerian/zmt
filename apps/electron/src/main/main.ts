import { app, BrowserWindow } from 'electron';

import { createMainWindow } from './factories';
import { initializePlugins } from './plugins';
import {
  initializeDefaultRoot,
  installContentSecurityPolicy,
  registerAppLifecycle,
  registerAssetImageHandlers,
  registerCharacterHandlers,
  registerEntityHandlers,
  registerEquipmentHandlers,
  registerFsHandlers,
  registerIdeologyHandlers,
  registerIndexHandlers,
  registerLocalisationHandlers,
  registerModuleHandlers,
  registerPluginsHandlers,
  registerPreferencesHandlers,
  registerStateHandlers,
  registerSystemHandlers,
  registerTechnologyHandlers,
  registerTechTreeGeometryHandlers,
  registerWorkspaceHandlers,
} from './setup';
import { workspaceStoreService } from './workspace';

async function bootstrap(): Promise<void> {
  registerSystemHandlers();
  registerAssetImageHandlers();
  registerCharacterHandlers();
  registerEntityHandlers();
  registerEquipmentHandlers();
  registerFsHandlers();
  registerIdeologyHandlers();
  registerIndexHandlers();
  registerLocalisationHandlers();
  registerModuleHandlers();
  registerPreferencesHandlers();
  registerStateHandlers();
  registerTechnologyHandlers();
  registerTechTreeGeometryHandlers();
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
