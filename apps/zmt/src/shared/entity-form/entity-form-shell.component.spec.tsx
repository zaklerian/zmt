import { createTheme, ThemeProvider } from '@mui/material';
import { EntityFormModel } from '@r-core';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  ShellContextProvider,
  ShellContextValue,
} from '../../app/shell/shell-context';
import { initI18n } from '../../i18n';
import { ModalContextProvider } from '../modal';
import { ModalContextValue } from '../modal/modal.model';
import { EntityFormShell } from './entity-form-shell.component';

const theme = createTheme();

const modal: ModalContextValue = {
  confirm: vi.fn().mockResolvedValue(true),
  info: vi.fn().mockResolvedValue(undefined),
};

const shell: ShellContextValue = {
  activeModId: null,
  activeModRootPath: null,
  confirmLeaveIfDirty: () => Promise.resolve(true),
  consumeLeaveConfirmed: () => false,
  registerEditGuard: () => () => undefined,
  selectedPath: null,
  selectedSupport: null,
  setViewMode: vi.fn(),
  signalLeaveConfirmed: () => undefined,
  viewMode: 'table',
};

function model(): EntityFormModel {
  return {
    blocks: [],
    errorMessage: () => 'error',
    errorTitle: 'Error',
    save: vi.fn().mockResolvedValue(undefined),
  };
}

function renderShell(onCancel?: () => void) {
  const router = createMemoryRouter([
    {
      element: (
        <ShellContextProvider value={shell}>
          <EntityFormShell model={model()} onCancel={onCancel} />
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

beforeAll(async () => {
  await initI18n('en');
});

beforeEach(() => {
  vi.mocked(modal.confirm).mockClear();
});

describe('EntityFormShell inline Cancel', () => {
  it('renders a Cancel button alongside Save when onCancel is provided', () => {
    renderShell(() => undefined);

    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
  });

  it('omits the Cancel button when no onCancel is provided', () => {
    renderShell();

    expect(
      screen.queryByRole('button', { name: 'Cancel' }),
    ).not.toBeInTheDocument();
  });

  it('closes without confirming when the form is not dirty', async () => {
    const onCancel = vi.fn();
    renderShell(onCancel);

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    await waitFor(() => expect(onCancel).toHaveBeenCalledTimes(1));
    expect(modal.confirm).not.toHaveBeenCalled();
  });
});
