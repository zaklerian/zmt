import { vi } from 'vitest';

vi.mock('electron', () => ({
  app: {
    getPath: vi.fn(),
    on: vi.fn(),
    quit: vi.fn(),
    setPath: vi.fn(),
    whenReady: vi.fn(),
  },
  BrowserWindow: Object.assign(vi.fn(), { fromWebContents: vi.fn(), getAllWindows: vi.fn() }),
  dialog: {
    showOpenDialog: vi.fn(),
  },
  ipcMain: {
    handle: vi.fn(),
    removeHandler: vi.fn(),
  },
  net: {
    fetch: vi.fn(),
  },
  protocol: {
    handle: vi.fn(),
    registerSchemesAsPrivileged: vi.fn(),
  },
  session: {
    defaultSession: {
      webRequest: {
        onHeadersReceived: vi.fn(),
      },
    },
  },
  shell: {
    openExternal: vi.fn(),
  },
}));

beforeEach(() => {
  vi.spyOn(console, 'error')
    .mockImplementation(() => undefined)
    .mockClear();
});
