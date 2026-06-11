import { AppApiModel } from '@contracts';
import { EntityTableData, EntityTableRecognizer, TranslateFn } from '@r-core';

import { buildModuleActions } from './module-actions';
import { MODULE_COLUMNS } from './module-columns.const';
import { mapModuleRow } from './module-row.util';
import { compareModuleEntities } from './module-sort.util';

const MODULE_DIR_SEGMENTS = ['common', 'units', 'equipment', 'modules'];

function load(
  filePath: string,
  translate: TranslateFn,
): Promise<EntityTableData> {
  const { api } = window as unknown as { readonly api: AppApiModel };
  return api.module.list(filePath).then((entities) => {
    const sorted = [...entities].sort(compareModuleEntities);
    const entitiesById = new Map(
      sorted.map((entity) => [entity.name, entity] as const),
    );
    return {
      actions: buildModuleActions(entitiesById, translate),
      columns: MODULE_COLUMNS,
      // Rows arrive pre-sorted (air first); no column-driven default sort.
      defaultSort: [],
      rows: sorted.map((entity) => mapModuleRow(entity, translate)),
    };
  });
}

function matchesModulePath(filePath: string): boolean {
  const segments = filePath
    .split(/[/\\]/)
    .filter((segment) => segment.length > 0);
  const last = segments[segments.length - 1];
  if (last === undefined || !last.toLowerCase().endsWith('.txt')) return false;

  // The modules dir must appear as consecutive path segments with the file
  // directly inside it — a segment-boundary check, not a string prefix, so the
  // parent common/units/equipment file does not match the module recognizer.
  for (let i = 0; i + MODULE_DIR_SEGMENTS.length < segments.length; i += 1) {
    const matchesDir = MODULE_DIR_SEGMENTS.every(
      (segment, offset) => segments[i + offset] === segment,
    );
    if (matchesDir && i + MODULE_DIR_SEGMENTS.length === segments.length - 1) {
      return true;
    }
  }
  return false;
}

export const MODULE_RECOGNIZER: EntityTableRecognizer = {
  id: 'hoi4-module',
  load,
  matches: matchesModulePath,
};
