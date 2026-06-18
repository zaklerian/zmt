import { AppApiModel } from '@contracts';
import { EntityTableData, EntityTableRecognizer, TranslateFn } from '@r-core';

import { buildStateActions } from './state-actions';
import { STATE_COLUMNS } from './state-columns.const';
import { STATE_ENTITY_ID } from './state-entity-id.const';
import { mapStateRow } from './state-row.util';
import { compareStateEntities } from './state-sort.util';

// STATE is `history/`-rooted, not `common/`-rooted: the segment-match mechanism
// is root-agnostic, so only this per-entity constant differs from the other
// recognizers (ADR 018).
const STATE_DIR_SEGMENTS = ['history', 'states'];

function load(
  filePath: string,
  _translate: TranslateFn,
): Promise<EntityTableData> {
  const { api } = window as unknown as { readonly api: AppApiModel };
  return api.state.list(filePath).then((entities) => {
    const sorted = [...entities].sort(compareStateEntities);
    const entitiesById = new Map(
      sorted.map((entity) => [entity.id, entity] as const),
    );
    return {
      actions: buildStateActions(entitiesById),
      columns: STATE_COLUMNS,
      // Rows arrive pre-sorted (by id); no column-driven default sort.
      defaultSort: [],
      rows: sorted.map((entity) => mapStateRow(entity)),
    };
  });
}

function matchesStatePath(filePath: string): boolean {
  const segments = filePath
    .split(/[/\\]/)
    .filter((segment) => segment.length > 0);
  const last = segments[segments.length - 1];
  if (last === undefined || !last.toLowerCase().endsWith('.txt')) return false;

  // The states dir must appear as consecutive path segments with the file
  // directly inside it — a segment-boundary check, not a string prefix.
  for (let i = 0; i + STATE_DIR_SEGMENTS.length < segments.length; i += 1) {
    const matchesDir = STATE_DIR_SEGMENTS.every(
      (segment, offset) => segments[i + offset] === segment,
    );
    if (matchesDir && i + STATE_DIR_SEGMENTS.length === segments.length - 1) {
      return true;
    }
  }
  return false;
}

export const STATE_RECOGNIZER: EntityTableRecognizer = {
  id: STATE_ENTITY_ID,
  load,
  matches: matchesStatePath,
};
