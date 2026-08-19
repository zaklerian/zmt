import type {
  AppApiModel,
  IndexSlimRow,
  SourcesTable,
  TechnologySlim,
  TechTreeFolderGeometry,
} from '@contracts';

import { renderHook, waitFor } from '@testing-library/react';
import { act } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { entityFormRegistry } from '../../../shared/entity-form';
import { useTechnologyAdd } from './use-technology-add.hook';

// ZMT-51 regression gates 1, 2 and 6 at the CANVAS seam: what the two add entry
// points resolve before the shared form is projected — the placement, the target
// file, and (add-as-child) the edge that joins the invoking technology's
// component. The form's own write shape is asserted in
// `libs/r-game-hoi4/src/technology/technology-form-descriptor.add.spec.ts`.

const lookup = vi.fn();
const project = vi.fn();

const SOURCES: SourcesTable = {
  '/mods/bice': { modId: 'bice', path: '/mods/bice', permission: 'editable' },
  '/steam/hoi4': { modId: null, path: '/steam/hoi4', permission: 'readonly' },
};

const FOLDER: TechTreeFolderGeometry = {
  area: null,
  background: null,
  folderId: 'air_techs_folder',
  gridboxes: [
    gridbox('tech_air_engine_jet_tree', 190, 172),
    gridbox('generic_fighter_tree', 340, 32),
  ],
  yearAxis: [
    { position: { x: 10, y: 140 }, text: '1933', tooltip: 'YEAR_1933' },
    { position: { x: 10, y: 280 }, text: '1936', tooltip: 'YEAR_1936' },
    { position: { x: 10, y: 420 }, text: '1940', tooltip: 'YEAR_1940' },
  ],
};

const ROWS: readonly IndexSlimRow<TechnologySlim>[] = [
  row('generic_fighter', { x: 5, y: 2 }, ['early_fighter']),
  row('early_fighter', { x: 5, y: 2 }, ['fighter1']),
  row('fighter1', { x: 3, y: 4 }, []),
];

beforeEach(() => {
  vi.clearAllMocks();
  Object.defineProperty(window, 'api', {
    configurable: true,
    value: { localisation: { lookup } } as unknown as AppApiModel,
    writable: true,
  });
  lookup.mockResolvedValue({
    defaultTarget: {
      modId: 'bice',
      relativePath: 'localisation/english/bice_l_english.yml',
    },
    entries: [],
  });
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

describe('useTechnologyAdd — add as child (gate 1)', () => {
  it('seeds a path edge to the invoking technology so it joins that component', async () => {
    const view = mount();

    act(() => {
      view.result.current.openChild('fighter1');
    });

    await waitFor(() => {
      expect(project).toHaveBeenCalled();
    });
    expect(project.mock.calls[0][0]).toMatchObject({
      paths: [{ scalars: [{ key: 'leads_to_tech', value: 'fighter1' }] }],
      token: '',
    });
  });

  it('places one year-row below the parent and seeds start_year from that row', async () => {
    const view = mount();

    act(() => {
      view.result.current.openChild('fighter1');
    });

    await waitFor(() => {
      expect(project).toHaveBeenCalled();
    });
    // fighter1 sits at cell (3,4) in `generic_fighter_tree`; the child lands at
    // (3,6), whose pixel row (32 + 6 × 70 = 452) prints 1940 in the gutter.
    expect(project.mock.calls[0][0]).toMatchObject({
      folders: [
        {
          position: [
            { key: 'x', value: '3' },
            { key: 'y', value: '6' },
          ],
          scalars: [{ key: 'name', value: 'air_techs_folder' }],
        },
      ],
      rootScalars: [{ key: 'start_year', value: '1940' }],
    });
  });

  it('nudges off an occupied cell rather than stacking two nodes (gate 6)', async () => {
    // A technology of the SAME component already sits one row below
    // `early_fighter` at (5,4) — same component, so same gridbox, so same pixel.
    const view = mount([
      ...ROWS,
      row('occupier', { x: 5, y: 4 }, ['fighter1']),
    ]);

    act(() => {
      view.result.current.openChild('early_fighter');
    });

    await waitFor(() => {
      expect(project).toHaveBeenCalled();
    });
    const position = (
      project.mock.calls[0][0] as { folders: { position: unknown }[] }
    ).folders[0].position;
    expect(position).not.toEqual([
      { key: 'x', value: '5' },
      { key: 'y', value: '4' },
    ]);
  });

  it('writes into the invoking technology’s own file', async () => {
    const view = mount();

    act(() => {
      view.result.current.openChild('fighter1');
    });

    await waitFor(() => {
      expect(project).toHaveBeenCalled();
    });
    expect(project.mock.calls[0][1]).toMatchObject({
      mode: 'add',
      modId: 'bice',
      relativePath: 'common/technologies/air_techs.txt',
    });
  });

  it('refuses to add onto a technology owned by a readonly source (ADR 027 D5)', async () => {
    const view = mount([
      {
        ...ROWS[2],
        provenance: { ...ROWS[2].provenance, sourceId: '/steam/hoi4' },
      },
    ]);

    act(() => {
      view.result.current.openChild('fighter1');
    });

    expect(view.result.current.status).toBe('readonly');
    expect(project).not.toHaveBeenCalled();
  });
});

describe('useTechnologyAdd — free placement (gate 2)', () => {
  it('measures the click in the ANCHOR gridbox and writes folder.name', async () => {
    const view = mount();

    act(() => {
      view.result.current.openFree({ x: 1603, y: 318 });
    });

    await waitFor(() => {
      expect(project).toHaveBeenCalled();
    });
    // Anchor origin (190,172), step 70 → cell (20,2).
    expect(project.mock.calls[0][0]).toMatchObject({
      folders: [
        {
          position: [
            { key: 'x', value: '20' },
            { key: 'y', value: '2' },
          ],
          scalars: [{ key: 'name', value: 'air_techs_folder' }],
        },
      ],
      paths: [],
    });
  });

  it('resolves the loc insert target — a new key has no owner to set', async () => {
    const view = mount();

    act(() => {
      view.result.current.openFree({ x: 400, y: 312 });
    });

    await waitFor(() => {
      expect(project).toHaveBeenCalled();
    });
    expect(lookup).toHaveBeenCalledWith([]);
    expect(project.mock.calls[0][1]).toMatchObject({
      localisation: {
        defaultTarget: {
          modId: 'bice',
          relativePath: 'localisation/english/bice_l_english.yml',
        },
        entries: [],
      },
    });
  });

  it('refuses when no editable source owns the folder', async () => {
    const view = mount(
      ROWS.map((entry) => ({
        ...entry,
        provenance: { ...entry.provenance, sourceId: '/steam/hoi4' },
      })),
    );

    act(() => {
      view.result.current.openFree({ x: 400, y: 312 });
    });

    expect(view.result.current.status).toBe('readonly');
    expect(project).not.toHaveBeenCalled();
  });

  it('refuses when the folder declares no geometry at all', () => {
    const view = renderHook(() =>
      useTechnologyAdd({
        allTechnologyIds: [],
        folder: null,
        rows: ROWS,
        sources: SOURCES,
        translate: (key) => key,
      }),
    );

    act(() => {
      view.result.current.openFree({ x: 400, y: 312 });
    });

    expect(view.result.current.status).toBe('error');
  });
});

function gridbox(name: string, x: number, y: number) {
  return {
    area: null,
    axis: 'UP',
    name,
    origin: { x, y },
    step: { height: 70, width: 70 },
  };
}

function mount(rows: readonly IndexSlimRow<TechnologySlim>[] = ROWS) {
  return renderHook(() =>
    useTechnologyAdd({
      allTechnologyIds: rows.map((entry) => entry.slim.id),
      folder: FOLDER,
      rows,
      sources: SOURCES,
      translate: (key) => key,
    }),
  );
}

function row(
  id: string,
  position: { x: number; y: number } | null,
  pathTargets: readonly string[],
): IndexSlimRow<TechnologySlim> {
  return {
    provenance: {
      reason: 'sole-definition',
      relativePath: 'common/technologies/air_techs.txt',
      shadowedSourceIds: [],
      sourceId: '/mods/bice',
    },
    slim: {
      categories: [],
      dependencyTargets: [],
      folderName: 'air_techs_folder',
      id,
      nodeKind: 'simple',
      pathTargets,
      position,
      startYear: null,
      subTechnologies: [],
    },
  };
}
