import { ModuleEntity } from '@contracts';
import { EntityRow } from '@r-core';

const EMPTY_CATEGORY = '—';

export function mapModuleRow(entity: ModuleEntity): EntityRow {
  return {
    cells: {
      category: entity.category === '' ? EMPTY_CATEGORY : entity.category,
      name: entity.name,
    },
    id: entity.name,
    state: 'normal',
  };
}
