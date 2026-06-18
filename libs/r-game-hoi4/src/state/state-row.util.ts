import { StateEntity } from '@contracts';
import { EntityRow } from '@r-core';

const EMPTY = '—';

export function mapStateRow(entity: StateEntity): EntityRow {
  const category = entity.rootScalars.find(
    (field) => field.key === 'state_category',
  );
  return {
    cells: {
      category: category?.value ?? EMPTY,
      id: entity.id === '' ? EMPTY : entity.id,
      name: entity.name === '' ? EMPTY : entity.name,
      provinces:
        entity.provinces.length === 0 ? EMPTY : String(entity.provinces.length),
    },
    id: entity.id,
    state: 'normal',
  };
}
