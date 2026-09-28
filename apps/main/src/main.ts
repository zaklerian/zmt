import { app, BrowserWindow, protocol, session } from 'electron';
import path from 'node:path';

import { registerAppLifecycle } from './app/app-lifecycle.util';
import { defaultRootPath, isDevMode, rendererDevUrl } from './app/dev-mode.util';
import { configureUserData } from './app/user-data.util';
import { createAllowedRoot } from './fs/allowed-root.service';
import { registerIpcHandlers } from './ipc/register-handlers.util';
import { KNOWN_PLUGINS } from './plugin/known-plugins.const';
import { createPluginRegistry, registerPlugins } from './plugin/plugin-registry.service';
import { APP_SCHEME, resolveAppOrigin, resolveStartUrl } from './window/app-origin.const';
import { APP_SCHEME_PRIVILEGES, handleAppRequest } from './window/app-protocol.util';
import { buildCsp, CSP_HEADER } from './window/csp.const';
import { createMainWindow } from './window/main-window.util';

const ENV = process.env;
const DEV_MODE = isDevMode(ENV);
configureUserData(app, DEV_MODE);
protocol.registerSchemesAsPrivileged([APP_SCHEME_PRIVILEGES]);

const APP_ORIGIN = resolveAppOrigin(ENV);
const ALLOWED_ROOT = createAllowedRoot(DEV_MODE ? defaultRootPath(ENV) : null);
const PLUGIN_REGISTRY = createPluginRegistry();
registerPlugins(PLUGIN_REGISTRY, KNOWN_PLUGINS);

function installDevCsp(devOrigin: string): void {
  const csp = buildCsp({ devOrigin, nonce: null });
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({ responseHeaders: { ...details.responseHeaders, [CSP_HEADER]: [csp] } });
  });
}

function openMainWindow(): void {
  createMainWindow({
    appOrigin: APP_ORIGIN,
    devTools: DEV_MODE,
    preloadPath: path.join(__dirname, '..', 'preload', 'main.js'),
    startUrl: resolveStartUrl(ENV),
  });
}

app
  .whenReady()
  .then(() => {
    registerAppLifecycle(app, {
      onActivate: () => {
        if (BrowserWindow.getAllWindows().length === 0) {
          openMainWindow();
        }
      },
      platform: process.platform,
    });
    registerIpcHandlers({
      allowedRoot: ALLOWED_ROOT,
      appOrigin: APP_ORIGIN,
      pluginRegistry: PLUGIN_REGISTRY,
    });
    const devUrl = rendererDevUrl(ENV);
    if (devUrl === null) {
      protocol.handle(APP_SCHEME, (request) =>
        handleAppRequest(request, { distDir: path.join(__dirname, '..', 'renderer', 'browser') }),
      );
    } else {
      installDevCsp(new URL(devUrl).origin);
    }
    openMainWindow();
  })
  .catch((error: unknown) => {
    console.error(error);
    app.quit();
  });
