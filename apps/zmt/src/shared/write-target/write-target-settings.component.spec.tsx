import type { AppApiModel } from '@contracts';

import { createTheme, ThemeProvider } from '@mui/material';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ReactNode } from 'react';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { initI18n } from '../../i18n';
import { WriteTargetSettings } from './write-target-settings.component';

// ZMT-57 regression gate 4 (choosing a not-yet-existing file) and gate 8 (the
// surface is a panel over the EXISTING preference plumbing). The file list is
// `fs:searchFiles`, the store is `preferences:get`/`set` — this spec asserts the
// panel uses exactly those and adds nothing of its own.

const preferencesGet = vi.fn();
const preferencesSet = vi.fn();
const searchFiles = vi.fn();
const workspaceGet = vi.fn();
const theme = createTheme();

function fileNode(absolutePath: string) {
  return {
    extension: '.txt',
    hasChildren: false,
    name: absolutePath.split('/').at(-1) ?? '',
    path: absolutePath,
    support: 'editable' as const,
    type: 'file' as const,
  };
}

function wrapper({ children }: { children: ReactNode }) {
  return <ThemeProvider theme={theme}>{children}</ThemeProvider>;
}

beforeAll(async () => {
  await initI18n('en');
});

beforeEach(() => {
  vi.clearAllMocks();
  Object.defineProperty(window, 'api', {
    configurable: true,
    value: {
      fs: { searchFiles },
      preferences: { get: preferencesGet, set: preferencesSet },
      workspace: { get: workspaceGet },
    } as unknown as AppApiModel,
    writable: true,
  });
  preferencesGet.mockResolvedValue(null);
  preferencesSet.mockResolvedValue(undefined);
  searchFiles.mockResolvedValue([]);
  workspaceGet.mockResolvedValue({
    includedMods: [
      { id: 'bice', name: 'BICE', path: '/mods/bice', permission: 'editable' },
      {
        id: 'vanilla-ish',
        name: 'Readonly',
        path: '/mods/ro',
        permission: 'readonly',
      },
    ],
  });
});

describe('WriteTargetSettings', () => {
  it('offers the mod’s existing files for a kind, read off the fs channel', async () => {
    searchFiles.mockResolvedValue([
      fileNode('/mods/bice/common/technologies/air_techs.txt'),
    ]);
    render(<WriteTargetSettings onClose={vi.fn()} />, { wrapper });

    await waitFor(() => {
      expect(searchFiles).toHaveBeenCalledWith(
        '/mods/bice/common/technologies',
        '.txt',
      );
    });

    fireEvent.mouseDown(screen.getByLabelText('New technologies'));
    await waitFor(() => {
      expect(
        screen.getByRole('option', {
          name: 'common/technologies/air_techs.txt',
        }),
      ).toBeInTheDocument();
    });
  });

  it('lists only editable mods — a readonly source is never a write target', async () => {
    render(<WriteTargetSettings onClose={vi.fn()} />, { wrapper });

    await waitFor(() => {
      expect(screen.getByLabelText('Mod')).toHaveTextContent('BICE');
    });
    fireEvent.mouseDown(screen.getByLabelText('Mod'));
    expect(screen.queryByRole('option', { name: 'Readonly' })).toBeNull();
  });

  it('persists a chosen existing file to the per-mod preference', async () => {
    searchFiles.mockResolvedValue([
      fileNode('/mods/bice/common/technologies/air_techs.txt'),
    ]);
    render(<WriteTargetSettings onClose={vi.fn()} />, { wrapper });

    await waitFor(() => {
      expect(searchFiles).toHaveBeenCalled();
    });
    fireEvent.mouseDown(screen.getByLabelText('New technologies'));
    fireEvent.click(
      await screen.findByRole('option', {
        name: 'common/technologies/air_techs.txt',
      }),
    );

    await waitFor(() => {
      expect(preferencesSet).toHaveBeenCalledWith('writeTargets', {
        bice: { technology: 'common/technologies/air_techs.txt' },
      });
    });
  });

  // Gate 4's renderer half: a file that does not exist yet is nameable, and is
  // stored as a mod-relative path under the kind's folder. The write that creates it
  // is asserted in `technology-add.util.spec.ts` and, end to end, in
  // `apps/electron/src/main/fs/entity-mutation.create.spec.ts`.
  it('stores a named new file under the kind’s folder, extension appended', async () => {
    render(<WriteTargetSettings onClose={vi.fn()} />, { wrapper });

    await waitFor(() => {
      expect(screen.getByLabelText('New technologies')).toBeInTheDocument();
    });
    fireEvent.mouseDown(screen.getByLabelText('New technologies'));
    fireEvent.click(
      await screen.findByRole('option', { name: 'Create a new file…' }),
    );
    fireEvent.change(await screen.findByLabelText('New file name'), {
      target: { value: 'zmt_new' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(preferencesSet).toHaveBeenCalledWith('writeTargets', {
        bice: { technology: 'common/technologies/zmt_new.txt' },
      });
    });
  });

  it('clears a target back to the computed default', async () => {
    preferencesGet.mockResolvedValue({
      bice: { technology: 'common/technologies/zmt_new.txt' },
    });
    render(<WriteTargetSettings onClose={vi.fn()} />, { wrapper });

    await waitFor(() => {
      expect(screen.getByLabelText('New technologies')).toHaveTextContent(
        'common/technologies/zmt_new.txt',
      );
    });
    fireEvent.mouseDown(screen.getByLabelText('New technologies'));
    fireEvent.click(
      await screen.findByRole('option', {
        name: 'Default (computed per write)',
      }),
    );

    await waitFor(() => {
      expect(preferencesSet).toHaveBeenCalledWith('writeTargets', { bice: {} });
    });
  });
});
