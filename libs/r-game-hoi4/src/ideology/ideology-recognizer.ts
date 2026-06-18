import { AppApiModel } from '@contracts';
import { EntityTableData, EntityTableRecognizer, TranslateFn } from '@r-core';

import { buildIdeologyActions } from './ideology-actions';
import { IDEOLOGY_COLUMNS } from './ideology-columns.const';
import { IDEOLOGY_ENTITY_ID } from './ideology-entity-id.const';
import { mapIdeologyRow } from './ideology-row.util';
import { compareIdeologyEntities } from './ideology-sort.util';

// Ideologies live under `common/ideologies/`. The segment-match mechanism is
// root-agnostic, so only this per-entity constant and the extractor's dir
// enumeration are bound (ADR 018).
const IDEOLOGY_DIR_SEGMENTS = ['common', 'ideologies'];

function load(
  filePath: string,
  _translate: TranslateFn,
): Promise<EntityTableData> {
  const { api } = window as unknown as { readonly api: AppApiModel };
  return api.ideology.list(filePath).then((entities) => {
    const sorted = [...entities].sort(compareIdeologyEntities);
    const entitiesById = new Map(
      sorted.map((entity) => [entity.token, entity] as const),
    );
    return {
      actions: buildIdeologyActions(entitiesById),
      columns: IDEOLOGY_COLUMNS,
      // Rows arrive pre-sorted (by token); no column-driven default sort.
      defaultSort: [],
      rows: sorted.map((entity) => mapIdeologyRow(entity)),
    };
  });
}

function matchesIdeologyPath(filePath: string): boolean {
  const segments = filePath
    .split(/[/\\]/)
    .filter((segment) => segment.length > 0);
  const last = segments[segments.length - 1];
  if (last === undefined || !last.toLowerCase().endsWith('.txt')) return false;

  // The ideologies dir must appear as consecutive path segments with the file
  // directly inside it — a segment-boundary check, not a string prefix.
  for (let i = 0; i + IDEOLOGY_DIR_SEGMENTS.length < segments.length; i += 1) {
    const matchesDir = IDEOLOGY_DIR_SEGMENTS.every(
      (segment, offset) => segments[i + offset] === segment,
    );
    if (
      matchesDir &&
      i + IDEOLOGY_DIR_SEGMENTS.length === segments.length - 1
    ) {
      return true;
    }
  }
  return false;
}

export const IDEOLOGY_RECOGNIZER: EntityTableRecognizer = {
  id: IDEOLOGY_ENTITY_ID,
  load,
  matches: matchesIdeologyPath,
};
