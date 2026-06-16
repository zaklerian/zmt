import { TechnologyEntity } from '@contracts';
import { EntityRow } from '@r-core';

const EMPTY = '—';

export function mapTechnologyRow(entity: TechnologyEntity): EntityRow {
  const categories = entity.categories.join(', ');
  return {
    cells: {
      categories: categories === '' ? EMPTY : categories,
      name: entity.token,
      paths: entity.paths.length === 0 ? EMPTY : String(entity.paths.length),
    },
    id: entity.token,
    state: 'normal',
  };
}
