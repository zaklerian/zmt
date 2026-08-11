import type { Edge } from '@xyflow/react';

import { useEffect, useState } from 'react';

import { entityIndexClient } from '../../../shared/entity-index';
import { techTreeGeometryClient } from '../../../shared/tech-tree-geometry';
import { buildAirTreeFlow, TechFlowNode } from '../build-air-tree-flow.util';

// The PoC air tree is the base plane tree, which lives entirely in this one
// folder (ZMT-43 grounding: every base air tech's `folder.name` is this, and the
// country trees are separate folders). Hardcoded because the `aircraft` feature
// IS this surface; a country switch (later) parameterizes it.
export const AIR_TECHS_FOLDER = 'air_techs_folder';

interface AirTechTree {
  readonly edges: readonly Edge[];
  readonly nodes: readonly TechFlowNode[];
  readonly status: AirTechTreeStatus;
}

type AirTechTreeStatus = 'error' | 'loading' | 'ready';

const EMPTY: AirTechTree = { edges: [], nodes: [], status: 'loading' };

// Fetches `index:list('technology')` + `techTreeGeometry:read` once, scopes the
// slim rows to `air_techs_folder` (plus the subs those techs attach), and holds
// the built react-flow graph in React state — no store, no data-fetching library
// (ADR 026 decision 2, L-005 closed). Server state is fetch-once-hold against the
// main-side cache.
export function useAirTechTree(): AirTechTree {
  const [state, setState] = useState<AirTechTree>(EMPTY);

  useEffect(() => {
    let cancelled = false;

    Promise.all([
      entityIndexClient.list('technology'),
      techTreeGeometryClient.read(),
    ])
      .then(([list, geometry]) => {
        if (cancelled) {
          return;
        }
        const folder = geometry.folders[AIR_TECHS_FOLDER];
        if (folder === undefined) {
          setState({ edges: [], nodes: [], status: 'ready' });
          return;
        }
        const slims = list.rows.map((row) => row.slim);
        const air = slims.filter((slim) => slim.folderName === AIR_TECHS_FOLDER);
        const subIds = new Set(air.flatMap((slim) => slim.subTechnologies));
        const subs = slims.filter(
          (slim) => slim.position === null && subIds.has(slim.id),
        );
        const { edges, nodes } = buildAirTreeFlow([...air, ...subs], folder);
        setState({ edges, nodes, status: 'ready' });
      })
      .catch(() => {
        if (!cancelled) {
          setState({ edges: [], nodes: [], status: 'error' });
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
