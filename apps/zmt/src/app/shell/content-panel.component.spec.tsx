import { FileSupport } from '@contracts';
import { createTheme, ThemeProvider } from '@mui/material';
import { recognizerRegistry } from '@r-core';
import { render, screen, waitFor } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { initI18n } from '../../i18n';
import { ModalContextProvider } from '../../shared/modal';
import { ModalContextValue } from '../../shared/modal/modal.model';
import { ContentPanel } from './content-panel.component';
import {
  ShellContextProvider,
  ShellContextValue,
  ViewMode,
} from './shell-context';

const theme = createTheme();
const readTextFile = vi.fn<(path: string) => Promise<string>>();

const modal: ModalContextValue = {
  confirm: vi.fn().mockResolvedValue(false),
  info: vi.fn().mockResolvedValue(undefined),
};

function installApiMock(): void {
  Object.defineProperty(window, 'api', {
    configurable: true,
    value: { fs: { readTextFile, writeTextFile: vi.fn() } },
    writable: true,
  });
}

function renderPanel(value: ShellContextValue) {
  const router = createMemoryRouter([
    {
      element: (
        <ShellContextProvider value={value}>
          <ContentPanel />
        </ShellContextProvider>
      ),
      path: '/',
    },
  ]);
  return render(
    <ThemeProvider theme={theme}>
      <ModalContextProvider value={modal}>
        <RouterProvider router={router} />
      </ModalContextProvider>
    </ThemeProvider>,
  );
}

function shell(
  selectedPath: string,
  selectedSupport: FileSupport,
  viewMode: ViewMode,
): ShellContextValue {
  return {
    activeModRootPath: null,
    confirmLeaveIfDirty: () => Promise.resolve(true),
    consumeLeaveConfirmed: () => false,
    registerEditGuard: () => () => undefined,
    selectedPath,
    selectedSupport,
    setViewMode: vi.fn(),
    signalLeaveConfirmed: () => undefined,
    viewMode,
  };
}

beforeAll(async () => {
  globalThis.ResizeObserver = class {
    disconnect(): void {
      // no-op: jsdom has no layout engine
    }
    observe(): void {
      // no-op: jsdom has no layout engine
    }
    unobserve(): void {
      // no-op: jsdom has no layout engine
    }
  };
  recognizerRegistry.register({
    id: 'test-equipment',
    load: () =>
      Promise.resolve({
        columns: [{ headerKey: 'mock.name', id: 'name', sortable: true }],
        defaultSort: [],
        rows: [{ cells: { name: 'Spitfire' }, id: 'r1', state: 'normal' }],
      }),
    matches: (path) => path.endsWith('/equip.txt'),
  });
  await initI18n('en');
});

beforeEach(() => {
  installApiMock();
  readTextFile.mockReset();
});

describe('ContentPanel dispatch', () => {
  it('routes a plain supported file to the editor', async () => {
    readTextFile.mockResolvedValue('plain content');
    renderPanel(shell('/mods/a/plain.txt', 'editable', 'table'));

    expect(await screen.findByText('plain content')).toBeInTheDocument();
    expect(screen.queryByRole('grid')).not.toBeInTheDocument();
  });

  it('leaves an unsupported file to the current behavior, not the editor', () => {
    renderPanel(shell('/mods/a/sprite.dds', 'unsupported', 'table'));

    expect(screen.queryByText('/mods/a/sprite.dds')).not.toBeInTheDocument();
    expect(readTextFile).not.toHaveBeenCalled();
  });

  it('renders the entity table for a recognized file in table mode', async () => {
    renderPanel(shell('/mods/a/equip.txt', 'editable', 'table'));

    expect(await screen.findByText('Spitfire')).toBeInTheDocument();
    expect(readTextFile).not.toHaveBeenCalled();
  });

  it('renders the editor for a recognized file in code mode', async () => {
    readTextFile.mockResolvedValue('raw equipment text');
    renderPanel(shell('/mods/a/equip.txt', 'editable', 'code'));

    expect(await screen.findByText('raw equipment text')).toBeInTheDocument();
    expect(screen.queryByRole('grid')).not.toBeInTheDocument();
    await waitFor(() =>
      expect(readTextFile).toHaveBeenCalledWith('/mods/a/equip.txt'),
    );
  });
});
