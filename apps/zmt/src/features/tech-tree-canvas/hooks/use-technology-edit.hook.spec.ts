import type { AppApiModel, SourcesTable } from '@contracts';

import { renderHook, waitFor } from '@testing-library/react';
import { act } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { entityFormRegistry } from '../../../shared/entity-form';
import { useTechnologyEdit } from './use-technology-edit.hook';

// ZMT-50 step 2 — opening the EXISTING descriptor form from a canvas node. The
// canvas holds slim rows, so the edit path must fetch `index:detail` and resolve
// the two things the ML file view got for free: where to write (provenance →
// sources table) and the localised name (`localisation:lookup`).

const detail = vi.fn();
const list = vi.fn();
const lookup = vi.fn();
const project = vi.fn();

const SOURCES: SourcesTable = {
  '/mods/bice': {
    modId: 'bice',
    path: '/mods/bice',
    permission: 'editable',
  },
  '/steam/hoi4': { modId: null, path: '/steam/hoi4', permission: 'readonly' },
};

const DETAIL = {
  entity: { token: 'air_superiority' },
  id: 'air_superiority',
  provenance: {
    reason: 'sole-definition',
    relativePath: 'common/technologies/air_doctrine.txt',
    shadowedSourceIds: [],
    sourceId: '/mods/bice',
  },
};

beforeEach(() => {
  vi.clearAllMocks();
  Object.defineProperty(window, 'api', {
    configurable: true,
    value: {
      index: { detail, list },
      localisation: { lookup },
    } as unknown as AppApiModel,
    writable: true,
  });
  detail.mockResolvedValue(DETAIL);
  lookup.mockResolvedValue({ defaultTarget: null, entries: [] });
  project.mockReturnValue({
    blocks: [],
    errorMessage: () => '',
    errorTitle: '',
    save: vi.fn(),
  });
  vi.spyOn(entityFormRegistry, 'resolve').mockReturnValue({
    entityId: 'technology',
    gameId: 'hoi4',
    project,
  });
});

function open(sources: SourcesTable = SOURCES) {
  const view = renderHook(() =>
    useTechnologyEdit(sources, ['air_superiority'], (key) => key),
  );
  act(() => {
    view.result.current.open('air_superiority');
  });
  return view;
}

describe('useTechnologyEdit', () => {
  it('fetches the full entity via index:detail — the canvas only holds slim rows', async () => {
    const view = open();

    await waitFor(() => {
      expect(view.result.current.model).not.toBeNull();
    });
    expect(detail).toHaveBeenCalledWith('technology', 'air_superiority');
  });

  it('looks up the technology’s loc keys and passes them to the projection', async () => {
    const view = open();

    await waitFor(() => {
      expect(view.result.current.model).not.toBeNull();
    });
    expect(lookup).toHaveBeenCalledWith([
      'air_superiority',
      'air_superiority_desc',
      'air_superiority_short',
    ]);
    expect(project.mock.calls[0][1]).toMatchObject({
      localisation: {
        defaultTarget: null,
        entries: [],
        takenIds: ['air_superiority'],
      },
      modId: 'bice',
      relativePath: 'common/technologies/air_doctrine.txt',
    });
  });

  it('refuses to open a technology owned by a readonly source (ADR 027 D5)', async () => {
    detail.mockResolvedValue({
      ...DETAIL,
      provenance: { ...DETAIL.provenance, sourceId: '/steam/hoi4' },
    });
    const view = open();

    await waitFor(() => {
      expect(view.result.current.status).toBe('readonly');
    });
    expect(view.result.current.model).toBeNull();
    expect(lookup).not.toHaveBeenCalled();
  });

  it('surfaces an error rather than opening a form that could not save', async () => {
    detail.mockRejectedValue({ code: 404, message: 'gone' });
    const view = open();

    await waitFor(() => {
      expect(view.result.current.status).toBe('error');
    });
    expect(view.result.current.model).toBeNull();
  });

  it('clears the model on close', async () => {
    const view = open();
    await waitFor(() => {
      expect(view.result.current.model).not.toBeNull();
    });

    act(() => {
      view.result.current.close();
    });

    expect(view.result.current.model).toBeNull();
    expect(view.result.current.status).toBe('idle');
  });
});
