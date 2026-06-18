import { IdeologyEntity } from '@contracts';
import { EntityRow } from '@r-core';

const EMPTY = '—';

export function mapIdeologyRow(entity: IdeologyEntity): EntityRow {
  return {
    cells: {
      name: entity.token === '' ? EMPTY : entity.token,
      types: entity.types.length === 0 ? EMPTY : String(entity.types.length),
    },
    id: entity.token,
    state: 'normal',
  };
}
