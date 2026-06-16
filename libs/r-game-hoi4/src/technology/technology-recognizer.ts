import { AppApiModel } from '@contracts';
import { EntityTableData, EntityTableRecognizer, TranslateFn } from '@r-core';

import { buildTechnologyActions } from './technology-actions';
import { TECHNOLOGY_COLUMNS } from './technology-columns.const';
import { TECHNOLOGY_ENTITY_ID } from './technology-entity-id.const';
import { mapTechnologyRow } from './technology-row.util';
import { compareTechnologyEntities } from './technology-sort.util';

const TECHNOLOGY_DIR_SEGMENTS = ['common', 'technologies'];

function load(
  filePath: string,
  _translate: TranslateFn,
): Promise<EntityTableData> {
  const { api } = window as unknown as { readonly api: AppApiModel };
  return api.technology.list(filePath).then((entities) => {
    const sorted = [...entities].sort(compareTechnologyEntities);
    const entitiesById = new Map(
      sorted.map((entity) => [entity.token, entity] as const),
    );
    return {
      actions: buildTechnologyActions(entitiesById),
      columns: TECHNOLOGY_COLUMNS,
      // Rows arrive pre-sorted (by token); no column-driven default sort.
      defaultSort: [],
      rows: sorted.map((entity) => mapTechnologyRow(entity)),
    };
  });
}

function matchesTechnologyPath(filePath: string): boolean {
  const segments = filePath
    .split(/[/\\]/)
    .filter((segment) => segment.length > 0);
  const last = segments[segments.length - 1];
  if (last === undefined || !last.toLowerCase().endsWith('.txt')) return false;

  // The technologies dir must appear as consecutive path segments with the file
  // directly inside it — a segment-boundary check, not a string prefix.
  for (
    let i = 0;
    i + TECHNOLOGY_DIR_SEGMENTS.length < segments.length;
    i += 1
  ) {
    const matchesDir = TECHNOLOGY_DIR_SEGMENTS.every(
      (segment, offset) => segments[i + offset] === segment,
    );
    if (
      matchesDir &&
      i + TECHNOLOGY_DIR_SEGMENTS.length === segments.length - 1
    ) {
      return true;
    }
  }
  return false;
}

export const TECHNOLOGY_RECOGNIZER: EntityTableRecognizer = {
  id: TECHNOLOGY_ENTITY_ID,
  load,
  matches: matchesTechnologyPath,
};
