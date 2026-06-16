import { AppApiModel } from '@contracts';
import { EntityTableData, EntityTableRecognizer, TranslateFn } from '@r-core';

import { buildCharacterActions } from './character-actions';
import { CHARACTER_COLUMNS } from './character-columns.const';
import { CHARACTER_ENTITY_ID } from './character-entity-id.const';
import { mapCharacterRow } from './character-row.util';
import { compareCharacterEntities } from './character-sort.util';

const CHARACTER_DIR_SEGMENTS = ['common', 'characters'];

function load(
  filePath: string,
  _translate: TranslateFn,
): Promise<EntityTableData> {
  const { api } = window as unknown as { readonly api: AppApiModel };
  return api.character.list(filePath).then((entities) => {
    const sorted = [...entities].sort(compareCharacterEntities);
    const entitiesById = new Map(
      sorted.map((entity) => [entity.token, entity] as const),
    );
    return {
      actions: buildCharacterActions(entitiesById),
      columns: CHARACTER_COLUMNS,
      // Rows arrive pre-sorted (by token); no column-driven default sort.
      defaultSort: [],
      rows: sorted.map((entity) => mapCharacterRow(entity)),
    };
  });
}

function matchesCharacterPath(filePath: string): boolean {
  const segments = filePath
    .split(/[/\\]/)
    .filter((segment) => segment.length > 0);
  const last = segments[segments.length - 1];
  if (last === undefined || !last.toLowerCase().endsWith('.txt')) return false;

  // The characters dir must appear as consecutive path segments with the file
  // directly inside it — a segment-boundary check, not a string prefix.
  for (let i = 0; i + CHARACTER_DIR_SEGMENTS.length < segments.length; i += 1) {
    const matchesDir = CHARACTER_DIR_SEGMENTS.every(
      (segment, offset) => segments[i + offset] === segment,
    );
    if (
      matchesDir &&
      i + CHARACTER_DIR_SEGMENTS.length === segments.length - 1
    ) {
      return true;
    }
  }
  return false;
}

export const CHARACTER_RECOGNIZER: EntityTableRecognizer = {
  id: CHARACTER_ENTITY_ID,
  load,
  matches: matchesCharacterPath,
};
