import { BrowserWindow, type BrowserWindowConstructorOptions, shell } from 'electron';

import { originOf } from '../ipc/ipc-sender.util';

export interface MainWindowOptions {
  readonly appOrigin: string;
  readonly devTools: boolean;
  readonly preloadPath: string;
  readonly startUrl: string;
}

export function mainWindowOptions(
  options: Pick<MainWindowOptions, 'devTools' | 'preloadPath'>,
): BrowserWindowConstructorOptions {
  return {
    autoHideMenuBar: true,
    height: 900,
    minHeight: 700,
    minWidth: 1000,
    show: false,
    webPreferences: {
      allowRunningInsecureContent: false,
      contextIsolation: true,
      devTools: options.devTools,
      nodeIntegration: false,
      nodeIntegrationInWorker: false,
      preload: options.preloadPath,
      sandbox: true,
      webSecurity: true,
      webviewTag: false,
    },
    width: 1400,
  };
}

export function isExternalLink(url: string): boolean {
  return url.startsWith('https://');
}

export function isAppNavigation(url: string, appOrigin: string): boolean {
  return originOf(url) === appOrigin;
}

export function lockDownNavigation(window: BrowserWindow, appOrigin: string): void {
  window.webContents.setWindowOpenHandler(({ url }) => {
    if (isExternalLink(url)) {
      void shell.openExternal(url);
    }
    return { action: 'deny' };
  });
  window.webContents.on('will-navigate', (event, url) => {
    if (!isAppNavigation(url, appOrigin)) {
      event.preventDefault();
    }
  });
  window.webContents.on('will-attach-webview', (event) => {
    event.preventDefault();
  });
}

export function createMainWindow(options: MainWindowOptions): BrowserWindow {
  const window = new BrowserWindow(mainWindowOptions(options));
  lockDownNavigation(window, options.appOrigin);
  window.once('ready-to-show', () => {
    window.show();
  });
  void window.loadURL(options.startUrl);
  return window;
}
