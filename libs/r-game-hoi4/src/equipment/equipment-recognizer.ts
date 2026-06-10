import { AppApiModel } from '@contracts';
import { EntityTableData, EntityTableRecognizer, TranslateFn } from '@r-core';

import { buildEquipmentActions } from './equipment-actions';
import { EQUIPMENT_COLUMNS } from './equipment-columns.const';
import { mapEquipmentRow } from './equipment-row.util';
import { compareEquipmentEntities } from './equipment-sort.util';

const EQUIPMENT_DIR_SEGMENTS = ['common', 'units', 'equipment'];

function load(
  filePath: string,
  translate: TranslateFn,
): Promise<EntityTableData> {
  const { api } = window as unknown as { readonly api: AppApiModel };
  return api.equipment.list(filePath).then((entities) => {
    const sorted = [...entities].sort(compareEquipmentEntities);
    const entitiesById = new Map(
      sorted.map((entity) => [entity.name, entity] as const),
    );
    return {
      actions: buildEquipmentActions(entitiesById, translate),
      columns: EQUIPMENT_COLUMNS,
      // Rows arrive pre-sorted (air first); no column-driven default sort.
      defaultSort: [],
      rows: sorted.map((entity) => mapEquipmentRow(entity, translate)),
    };
  });
}

function matchesEquipmentPath(filePath: string): boolean {
  const segments = filePath
    .split(/[/\\]/)
    .filter((segment) => segment.length > 0);
  const last = segments[segments.length - 1];
  if (last === undefined || !last.toLowerCase().endsWith('.txt')) return false;

  // The equipment dir must appear as consecutive path segments with the file
  // directly inside it — a segment-boundary check, not a string prefix, so
  // siblings like common/units/equipment_modules do not match.
  for (let i = 0; i + EQUIPMENT_DIR_SEGMENTS.length < segments.length; i += 1) {
    const matchesDir = EQUIPMENT_DIR_SEGMENTS.every(
      (segment, offset) => segments[i + offset] === segment,
    );
    if (
      matchesDir &&
      i + EQUIPMENT_DIR_SEGMENTS.length === segments.length - 1
    ) {
      return true;
    }
  }
  return false;
}

export const EQUIPMENT_RECOGNIZER: EntityTableRecognizer = {
  id: 'hoi4-equipment',
  load,
  matches: matchesEquipmentPath,
};
