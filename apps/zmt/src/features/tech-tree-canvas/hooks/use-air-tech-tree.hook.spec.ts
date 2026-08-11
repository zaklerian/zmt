import type {
  IndexListResult,
  TechnologySlim,
  TechTreeGeometry,
} from '@contracts';

import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { entityIndexClient } from '../../../shared/entity-index';
import { techTreeGeometryClient } from '../../../shared/tech-tree-geometry';
import { useAirTechTree } from './use-air-tech-tree.hook';

const GEOMETRY: TechTreeGeometry = {
  folders: {
    air_techs_folder: {
      area: { height: 1300, width: 3720 },
      background: 'GFX_air_techtree_bg',
      folderId: 'air_techs_folder',
      gridboxes: [
        {
          area: null,
          axis: 'UP',
          name: 'generic_fighter_tree',
          origin: { x: 340, y: 32 },
          step: { height: 70, width: 70 },
        },
      ],
      yearAxis: [],
    },
  },
  provenance: null,
};

describe('useAirTechTree', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('builds the air graph from slim rows + geometry, excluding non-air rows', async () => {
    mockClients(
      [
        slim('generic_fighter', { x: 5, y: 2 }, ['early_fighter']),
        slim('early_fighter', { x: 5, y: 2 }, ['multi_role1'], [
          'cv_early_fighter',
        ]),
        slim('multi_role1', { x: 11, y: 4 }, []),
        { ...slim('cv_early_fighter', null, []), nodeKind: 'sub' },
        // A different folder — must be filtered out.
        {
          ...slim('infantry_weapons', { x: 0, y: 0 }, []),
          folderName: 'infantry_folder',
        },
      ],
      GEOMETRY,
    );

    const { result } = renderHook(() => useAirTechTree());

    await waitFor(() => expect(result.current.status).toBe('ready'));
    const ids = result.current.nodes.map((n) => n.id);
    expect(ids).toContain('multi_role1');
    expect(ids).toContain('cv_early_fighter');
    expect(ids).not.toContain('infantry_weapons');
  });

  it('reports error status when a fetch rejects', async () => {
    vi.spyOn(entityIndexClient, 'list').mockRejectedValue(new Error('boom'));
    vi.spyOn(techTreeGeometryClient, 'read').mockResolvedValue(GEOMETRY);

    const { result } = renderHook(() => useAirTechTree());

    await waitFor(() => expect(result.current.status).toBe('error'));
    expect(result.current.nodes).toEqual([]);
  });
});

function mockClients(
  slims: readonly TechnologySlim[],
  geometry: TechTreeGeometry,
): void {
  const list: IndexListResult<'technology'> = {
    rows: slims.map((s) => ({
      provenance: { reason: 'sole-provider', shadowedSourceIds: [], sourceId: 's1' },
      slim: s,
    })),
    sources: {},
  };
  vi.spyOn(entityIndexClient, 'list').mockResolvedValue(list);
  vi.spyOn(techTreeGeometryClient, 'read').mockResolvedValue(geometry);
}

function slim(
  id: string,
  position: { x: number; y: number } | null,
  pathTargets: readonly string[],
  subTechnologies: readonly string[] = [],
): TechnologySlim {
  return {
    categories: [],
    dependencyTargets: [],
    folderName: position === null ? null : 'air_techs_folder',
    id,
    nodeKind: position === null ? 'sub' : 'simple',
    pathTargets,
    position,
    startYear: null,
    subTechnologies,
  };
}
