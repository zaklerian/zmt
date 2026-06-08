import { BrowserWindow, shell } from 'electron';
import path from 'node:path';

export function createMainWindow(): BrowserWindow {
  const window = new BrowserWindow({
    autoHideMenuBar: true,
    height: 900,
    minHeight: 700,
    minWidth: 1000,
    show: false,
    webPreferences: {
      contextIsolation: true,
      devTools: isDevMode(),
      nodeIntegration: false,
      preload: resolvePreloadPath(),
      sandbox: true,
    },
    width: 1400,
  });

  lockDownNavigation(window);
  setupDevTools(window);

  const rendererUrl = process.env.ZMT_RENDERER_URL;

  if (rendererUrl) {
    void window.loadURL(rendererUrl);
  } else {
    void window.loadFile(path.join(process.cwd(), 'dist/apps/zmt/index.html'));
  }

  window.once('ready-to-show', () => window.show());

  return window;
}

function isDevMode(): boolean {
  return Boolean(process.env.ZMT_RENDERER_URL);
}

function lockDownNavigation(window: BrowserWindow): void {
  window.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url);
    return { action: 'deny' };
  });

  window.webContents.on('will-navigate', (event, url) => {
    const allowed = process.env.ZMT_RENDERER_URL ?? 'file://';
    if (!url.startsWith(allowed)) {
      event.preventDefault();
    }
  });
}

function resolvePreloadPath(): string {
  return path.join(__dirname, '../preload/preload.js');
}

function setupDevTools(window: BrowserWindow): void {
  if (!isDevMode()) return;

  window.webContents.openDevTools({ mode: 'detach' });

  window.webContents.on('before-input-event', (_event, input) => {
    const isI = input.key.toLowerCase() === 'i';
    const isF12 = input.key === 'F12';
    const isWinLinuxCombo = input.control && input.shift && isI;
    const isMacCombo = input.meta && input.alt && isI;

    if (!isF12 && !isWinLinuxCombo && !isMacCombo) return;

    if (window.webContents.isDevToolsOpened()) {
      window.webContents.closeDevTools();
    } else {
      window.webContents.openDevTools({ mode: 'detach' });
    }
  });
}
