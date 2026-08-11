import type { AppApiModel, GamePlugin } from '@contracts';

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ZmtApp } from '../zmt-app.component';

const AIRCRAFT_PLUGIN = {
  displayName: 'Hearts of Iron IV',
  features: [{ enabled: true, featureId: 'aircraft', label: 'Aircraft' }],
  gameId: 'hoi4',
} as unknown as GamePlugin;

const EDITABLE_MOD = {
  id: 'mod-1',
  name: 'My Mod',
  path: '/mods/my-mod',
  permission: 'editable',
} as const;

async function expandDrawer(): Promise<void> {
  fireEvent.click(await screen.findByTestId('ChevronRightIcon'));
}

function installApiMock(): void {
  const api = {
    fs: {
      listDirectory: vi.fn().mockResolvedValue([]),
      openFolderDialog: vi.fn().mockResolvedValue(null),
      readTextFile: vi.fn().mockResolvedValue(''),
      searchFiles: vi.fn().mockResolvedValue([]),
      writeBinaryFile: vi.fn().mockResolvedValue(undefined),
      writeTextFile: vi.fn().mockResolvedValue(undefined),
    },
    index: {
      detail: vi.fn().mockResolvedValue(undefined),
      list: vi.fn().mockResolvedValue({ rows: [], sources: {} }),
    },
    plugins: { list: vi.fn().mockResolvedValue([AIRCRAFT_PLUGIN]) },
    preferences: {
      get: vi.fn().mockResolvedValue(null),
      getAll: vi.fn().mockResolvedValue({}),
      set: vi.fn().mockResolvedValue(undefined),
    },
    system: { ping: vi.fn().mockResolvedValue('pong') },
    techTreeGeometry: {
      read: vi.fn().mockResolvedValue({ folders: {}, provenance: null }),
    },
    workspace: {
      addMod: vi.fn().mockResolvedValue({ includedMods: [EDITABLE_MOD] }),
      get: vi.fn().mockResolvedValue({ includedMods: [EDITABLE_MOD] }),
      removeMod: vi.fn().mockResolvedValue({ includedMods: [] }),
    },
  } as unknown as AppApiModel;
  Object.defineProperty(window, 'api', {
    configurable: true,
    value: api,
    writable: true,
  });
}

describe('AppShell nav mode', () => {
  beforeEach(() => {
    installApiMock();
  });

  it('shows the nav-mode toggle once a feature is enabled', async () => {
    render(<ZmtApp />);
    await expandDrawer();

    expect(
      await screen.findByRole('button', { name: 'Feature navigation' }),
    ).toBeInTheDocument();
  });

  it('switches the left panel from file mode to a searchless feature list', async () => {
    render(<ZmtApp />);
    await expandDrawer();

    expect(
      await screen.findByPlaceholderText('Search files…'),
    ).toBeInTheDocument();

    fireEvent.click(
      await screen.findByRole('button', { name: 'Feature navigation' }),
    );

    await waitFor(() =>
      expect(
        screen.queryByPlaceholderText('Search files…'),
      ).not.toBeInTheDocument(),
    );
    expect(
      screen.getByRole('button', { name: 'Aircraft' }),
    ).toBeInTheDocument();
  });

  it('renders the tech-tree canvas region for the aircraft feature (ZMT-43, replacing the placeholder)', async () => {
    render(<ZmtApp />);
    await expandDrawer();

    fireEvent.click(
      await screen.findByRole('button', { name: 'Feature navigation' }),
    );
    fireEvent.click(await screen.findByRole('button', { name: 'Aircraft' }));

    // The canvas mounts and fetches; with no air folder in the (mocked) geometry
    // it settles on its empty state rather than the retired placeholder text.
    expect(
      await screen.findByText('No air technologies to display.'),
    ).toBeInTheDocument();
  });
});
