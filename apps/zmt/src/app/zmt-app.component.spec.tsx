import type { AppApiModel } from '@contracts';

import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ZmtApp } from './zmt-app.component';

function installApiMock(): void {
  const api: AppApiModel = {
    fs: {
      getCurrentRoot: vi.fn().mockResolvedValue(null),
      listDirectory: vi.fn().mockResolvedValue([]),
      openFolderDialog: vi.fn().mockResolvedValue(null),
      readTextFile: vi.fn().mockResolvedValue(''),
      searchFiles: vi.fn().mockResolvedValue([]),
      writeBinaryFile: vi.fn().mockResolvedValue(undefined),
      writeTextFile: vi.fn().mockResolvedValue(undefined),
    },
    plugins: {
      list: vi.fn().mockResolvedValue([]),
    },
    preferences: {
      get: vi.fn().mockResolvedValue(null),
      getAll: vi.fn().mockResolvedValue({}),
      set: vi.fn().mockResolvedValue(undefined),
    },
    system: {
      ping: vi.fn().mockResolvedValue('pong'),
    },
  };
  Object.defineProperty(window, 'api', {
    configurable: true,
    value: api,
    writable: true,
  });
}

describe('ZmtApp', () => {
  beforeEach(() => {
    installApiMock();
  });

  it('renders without crashing', () => {
    expect(() => render(<ZmtApp />)).not.toThrow();
  });

  it('renders the header once i18n is ready', async () => {
    render(<ZmtApp />);
    expect(await screen.findByRole('banner')).toBeInTheDocument();
  });
});
