import type {
  IndexSlimRow,
  SourcesTable,
  TechnologyEntity,
  TechnologyPosition,
  TechnologySlim,
  TechTreeFolderGeometry,
  TechTreeGridbox,
  TechTreePoint,
} from '@contracts';
import type { EntityFormModel, TranslateFn } from '@r-core';
import type { TechnologyAddTarget } from '@r-game-hoi4';

import { GAME_IDS } from '@contracts';
import { TECHNOLOGY_ENTITY_ID } from '@r-game-hoi4';
import { useCallback, useState } from 'react';

import { entityFormRegistry } from '../../../shared/entity-form';
import { lookupLocalisation } from '../../../shared/localisation';
import {
  anchorGridbox,
  cellFromPixel,
  CHILD_CELL_OFFSET,
  gutterYearAt,
  nudgeToFreeCell,
  pixelKey,
} from '../add-placement.util';
import { bindNodesToGridboxes } from '../air-node-binding.util';
import { techNodePixel } from '../tech-node-pixel.util';

export interface TechnologyAdd {
  readonly close: () => void;
  readonly model: EntityFormModel | null;
  // Add-as-child: the new technology carries a `path` edge TO the invoking one, so
  // it joins that technology's component by construction (ZMT-43) and needs no
  // gridbox guess — it binds where its parent binds.
  readonly openChild: (parentId: string) => void;
  // Free placement: a click on empty canvas, in flow-pixel space.
  readonly openFree: (pixel: TechTreePoint) => void;
  readonly status: TechnologyAddStatus;
}

export interface TechnologyAddContext {
  readonly allTechnologyIds: readonly string[];
  readonly folder: null | TechTreeFolderGeometry;
  readonly rows: readonly IndexSlimRow<TechnologySlim>[];
  readonly sources: SourcesTable;
  readonly translate: TranslateFn;
}

export type TechnologyAddStatus = 'error' | 'idle' | 'loading' | 'readonly';

// Opens the SAME technology form the canvas edits with, in add mode (ADR 028
// decision 5) — no second descriptor, no second delta builder. The two entry
// points differ only in how the placement and the target file are resolved:
//
//   - openChild — the new technology gets a `path` edge to the invoking one, so it
//     joins that component and binds to the same gridbox by construction; it is
//     placed one tier below the parent, and written into the parent's own file.
//   - openFree — no edge, so no component and no derivable gridbox. It is measured
//     in the folder's ANCHOR gridbox, the same frame the reload binding falls back
//     to, which is what makes it reload where it was placed
//     (`add-placement.util.ts` carries the full rule and why the ticket's
//     declared-area rule could not be used).
//
// Both nudge off an occupied cell first (gate 6) and both commit through the same
// atomic insert batch the descriptor composes.
export function useTechnologyAdd({
  allTechnologyIds,
  folder,
  rows,
  sources,
  translate,
}: TechnologyAddContext): TechnologyAdd {
  const [model, setModel] = useState<EntityFormModel | null>(null);
  const [status, setStatus] = useState<TechnologyAddStatus>('idle');

  const close = useCallback(() => {
    setModel(null);
    setStatus('idle');
  }, []);

  const openAt = useCallback(
    (
      geometry: TechTreeFolderGeometry,
      gridbox: TechTreeGridbox,
      cell: TechnologyPosition,
      target: TechnologyAddTarget,
      parentId: null | string,
    ) => {
      const descriptor = entityFormRegistry.resolve(
        GAME_IDS.hoi4,
        TECHNOLOGY_ENTITY_ID,
      );
      if (descriptor === null) return;
      setStatus('loading');
      setModel(null);

      void (async () => {
        try {
          // An empty key set: a token that does not exist yet owns no loc key, so
          // the only thing this resolves is the ADR 028 decision 6 default insert
          // target the new name key lands in.
          const localisation = await lookupLocalisation([]);
          setModel(
            descriptor.project(
              seedTechnology(
                geometry.folderId,
                cell,
                parentId,
                gutterYearAt(techNodePixel(cell, gridbox).y, geometry.yearAxis),
              ),
              {
                localisation: {
                  defaultTarget: localisation.defaultTarget,
                  entries: [],
                  takenIds: allTechnologyIds,
                },
                mode: 'add',
                modId: target.modId,
                relativePath: target.relativePath,
                translate,
              },
            ),
          );
          setStatus('idle');
        } catch {
          setStatus('error');
        }
      })();
    },
    [allTechnologyIds, translate],
  );

  const openChild = useCallback(
    (parentId: string) => {
      if (folder === null) {
        setStatus('error');
        return;
      }
      const parent = rows.find((row) => row.slim.id === parentId);
      const position = parent?.slim.position ?? null;
      if (parent === undefined || position === null) {
        setStatus('error');
        return;
      }
      const target = targetOf(parent, sources);
      if (target === null) {
        setStatus('readonly');
        return;
      }
      const gridbox =
        bindNodesToGridboxes(
          rows.map((row) => row.slim),
          folder,
        ).get(parentId) ?? anchorGridbox(folder);
      if (gridbox === null) {
        setStatus('error');
        return;
      }
      const cell = nudgeToFreeCell(
        {
          x: position.x + CHILD_CELL_OFFSET.x,
          y: position.y + CHILD_CELL_OFFSET.y,
        },
        gridbox,
        occupiedPixelsOf(rows, folder),
      );
      openAt(folder, gridbox, cell, target, parentId);
    },
    [folder, openAt, rows, sources],
  );

  const openFree = useCallback(
    (pixel: TechTreePoint) => {
      const gridbox = folder === null ? null : anchorGridbox(folder);
      if (folder === null || gridbox === null) {
        setStatus('error');
        return;
      }
      const target = defaultTargetOf(rows, sources);
      if (target === null) {
        setStatus('readonly');
        return;
      }
      const cell = nudgeToFreeCell(
        cellFromPixel(pixel, gridbox),
        gridbox,
        occupiedPixelsOf(rows, folder),
      );
      openAt(folder, gridbox, cell, target, null);
    },
    [folder, openAt, rows, sources],
  );

  return {
    close,
    model,
    openChild,
    openFree,
    status,
  };
}

// Free placement has no invoking technology and therefore no file to inherit. The
// BASELINE target is the editable file that already owns the most of this folder's
// technologies — the folder's de-facto home in this workspace, read from the data
// rather than hardcoded. Ties break on the lower path so the choice is stable
// across runs. Null when the folder has no editable owner at all (an all-vanilla
// workspace), which refuses the add rather than inventing a file to create.
function defaultTargetOf(
  rows: readonly IndexSlimRow<TechnologySlim>[],
  sources: SourcesTable,
): null | TechnologyAddTarget {
  const counts = new Map<
    string,
    { count: number; target: TechnologyAddTarget }
  >();
  for (const row of rows) {
    const target = targetOf(row, sources);
    if (target === null) continue;
    const key = `${target.modId}/${target.relativePath}`;
    const seen = counts.get(key);
    if (seen === undefined) counts.set(key, { count: 1, target });
    else seen.count += 1;
  }
  let best: { count: number; target: TechnologyAddTarget } | null = null;
  for (const candidate of counts.values()) {
    if (
      best === null ||
      candidate.count > best.count ||
      (candidate.count === best.count &&
        candidate.target.relativePath < best.target.relativePath)
    ) {
      best = candidate;
    }
  }
  return best?.target ?? null;
}

// Every rendered node's pixel, the occupancy the safe-position nudge tests
// against. Pixels, not cells: the canvas draws all gridboxes into one plane.
function occupiedPixelsOf(
  rows: readonly IndexSlimRow<TechnologySlim>[],
  folder: TechTreeFolderGeometry,
): ReadonlySet<string> {
  const binding = bindNodesToGridboxes(
    rows.map((row) => row.slim),
    folder,
  );
  const occupied = new Set<string>();
  for (const { slim } of rows) {
    const gridbox = binding.get(slim.id);
    if (slim.position === null || gridbox === undefined) continue;
    occupied.add(pixelKey(techNodePixel(slim.position, gridbox)));
  }
  return occupied;
}

// The blank technology the add form is projected over: empty everywhere except
// the facts the CANVAS knows and the user cannot type — where it sits and, for an
// add-as-child, which technology it hangs off. `token` is empty on purpose: it is
// derived at save from the public name the user has not typed yet (ADR 028 D4 /
// ledger L-023), or from the token field if they override it.
function seedTechnology(
  folderId: string,
  cell: TechnologyPosition,
  parentId: null | string,
  startYear: null | number,
): TechnologyEntity {
  return {
    categories: [],
    dependencies: [],
    enableEquipmentModules: [],
    enableEquipments: [],
    enableSubunits: [],
    folders: [
      {
        position: [
          { key: 'x', value: String(cell.x) },
          { key: 'y', value: String(cell.y) },
        ],
        scalars: [{ key: 'name', value: folderId }],
      },
    ],
    paths:
      parentId === null
        ? []
        : [{ scalars: [{ key: 'leads_to_tech', value: parentId }] }],
    // ADR 028 decision 2: a DEFAULT seeded from the placement row's gutter year,
    // independently editable from there. `start_year` and `position.y` stay two
    // distinct quantities; this is the one moment they touch.
    rootScalars:
      startYear === null
        ? []
        : [{ key: 'start_year', value: String(startYear) }],
    subTechnologies: [],
    token: '',
    xor: [],
  };
}

// A row's write target: the editable mod that owns it plus the file the winning
// definition was read from. Null for a vanilla-owned row — writing there is the
// deferred create-override case (ADR 027 decision 5), not an add.
function targetOf(
  row: IndexSlimRow<TechnologySlim>,
  sources: SourcesTable,
): null | TechnologyAddTarget {
  const source = sources[row.provenance.sourceId];
  if (source === undefined || source.permission !== 'editable') return null;
  const { modId } = source;
  if (modId === null) return null;
  return { modId, relativePath: row.provenance.relativePath };
}
