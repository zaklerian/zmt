import { BrowserWindow, shell } from 'electron';

import {
  createMainWindow,
  isAppNavigation,
  isExternalLink,
  lockDownNavigation,
  mainWindowOptions,
} from './main-window.util';

type Listener = (...args: readonly unknown[]) => void;

type OpenHandler = (details: { readonly url: string }) => { readonly action: string };

interface FakeWindow {
  readonly listeners: ReadonlyMap<string, Listener>;
  readonly loadURL: ReturnType<typeof vi.fn>;
  readonly show: ReturnType<typeof vi.fn>;
  readonly webContents: {
    readonly on: ReturnType<typeof vi.fn>;
    readonly openHandler: ReadonlyMap<'current', OpenHandler>;
    readonly setWindowOpenHandler: ReturnType<typeof vi.fn>;
  };
}

function fakeWindow(): FakeWindow {
  const listeners = new Map<string, Listener>();
  const openHandler = new Map<'current', OpenHandler>();
  return {
    listeners,
    loadURL: vi.fn(async () => Promise.resolve()),
    once: vi.fn((event: string, listener: Listener) => {
      listeners.set(event, listener);
    }),
    show: vi.fn(),
    webContents: {
      on: vi.fn((event: string, listener: Listener) => {
        listeners.set(event, listener);
      }),
      openHandler,
      setWindowOpenHandler: vi.fn((handler: OpenHandler) => {
        openHandler.set('current', handler);
      }),
    },
  } as unknown as FakeWindow;
}

const OPTIONS = {
  appOrigin: 'zmt://renderer',
  devTools: false,
  preloadPath: '/dist/apps/preload/main.js',
  startUrl: 'zmt://renderer/index.html',
} as const;

describe('mainWindowOptions (SEC-2)', () => {
  it('hardens the web preferences', () => {
    const options = mainWindowOptions({ devTools: false, preloadPath: '/p/main.js' });
    expect(options.webPreferences).toEqual({
      allowRunningInsecureContent: false,
      contextIsolation: true,
      devTools: false,
      nodeIntegration: false,
      nodeIntegrationInWorker: false,
      preload: '/p/main.js',
      sandbox: true,
      webSecurity: true,
      webviewTag: false,
    });
    expect(options.show).toBe(false);
    expect(options.autoHideMenuBar).toBe(true);
  });

  it('enables devtools only when asked', () => {
    expect(mainWindowOptions({ devTools: true, preloadPath: '/p' }).webPreferences?.devTools).toBe(
      true,
    );
  });
});

describe('lockDownNavigation', () => {
  it('denies window.open and forwards only https links to the shell', () => {
    const window = fakeWindow();
    lockDownNavigation(window as unknown as BrowserWindow, OPTIONS.appOrigin);
    vi.mocked(shell.openExternal).mockReset();
    expect(
      window.webContents.openHandler.get('current')?.({ url: 'https://example.com/' }),
    ).toEqual({
      action: 'deny',
    });
    expect(shell.openExternal).toHaveBeenCalledWith('https://example.com/');
    expect(window.webContents.openHandler.get('current')?.({ url: 'file:///etc/passwd' })).toEqual({
      action: 'deny',
    });
    expect(
      window.webContents.openHandler.get('current')?.({ url: 'zmt://renderer/other' }),
    ).toEqual({
      action: 'deny',
    });
    expect(shell.openExternal).toHaveBeenCalledTimes(1);
  });

  it('prevents navigation away from the app origin', () => {
    const window = fakeWindow();
    lockDownNavigation(window as unknown as BrowserWindow, OPTIONS.appOrigin);
    const navigate = window.listeners.get('will-navigate');
    const blocked = { preventDefault: vi.fn() };
    navigate?.(blocked, 'https://example.com/');
    expect(blocked.preventDefault).toHaveBeenCalledTimes(1);
    const allowed = { preventDefault: vi.fn() };
    navigate?.(allowed, 'zmt://renderer/route');
    expect(allowed.preventDefault).not.toHaveBeenCalled();
  });

  it('prevents webview attachment', () => {
    const window = fakeWindow();
    lockDownNavigation(window as unknown as BrowserWindow, OPTIONS.appOrigin);
    const event = { preventDefault: vi.fn() };
    window.listeners.get('will-attach-webview')?.(event);
    expect(event.preventDefault).toHaveBeenCalledTimes(1);
  });
});

describe('createMainWindow', () => {
  it('constructs a hardened window, locks it down, loads the start url and shows when ready', () => {
    const window = fakeWindow();
    vi.mocked(BrowserWindow).mockImplementation(function () {
      return window as unknown as BrowserWindow;
    });
    const created = createMainWindow(OPTIONS);
    expect(created).toBe(window);
    expect(vi.mocked(BrowserWindow).mock.calls[0]?.[0]).toEqual(
      mainWindowOptions({ devTools: false, preloadPath: OPTIONS.preloadPath }),
    );
    expect(window.webContents.setWindowOpenHandler).toHaveBeenCalledTimes(1);
    expect(window.loadURL).toHaveBeenCalledWith(OPTIONS.startUrl);
    expect(window.show).not.toHaveBeenCalled();
    window.listeners.get('ready-to-show')?.();
    expect(window.show).toHaveBeenCalledTimes(1);
  });
});

describe('url predicates', () => {
  it('treats only https as an external link', () => {
    expect(isExternalLink('https://x.y/')).toBe(true);
    expect(isExternalLink('http://x.y/')).toBe(false);
    expect(isExternalLink('javascript:alert(1)')).toBe(false);
  });

  it('matches app navigation by origin', () => {
    expect(isAppNavigation('zmt://renderer/a', 'zmt://renderer')).toBe(true);
    expect(isAppNavigation('zmt://other/a', 'zmt://renderer')).toBe(false);
    expect(isAppNavigation('http://localhost:4200/a', 'http://localhost:4200')).toBe(true);
  });
});
