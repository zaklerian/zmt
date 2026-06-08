import { beforeEach, vi } from 'vitest';

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
});

vi.mock('electron', () => ({
  BrowserWindow: {
    fromWebContents: vi.fn(),
  },
  dialog: {
    showOpenDialog: vi.fn(),
  },
  ipcMain: {
    handle: vi.fn(),
    removeHandler: vi.fn(),
  },
}));
