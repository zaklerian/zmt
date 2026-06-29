import { CharacterEntity } from '@contracts';
import { EntityRow } from '@r-core';

const EMPTY = '—';

export function mapCharacterRow(entity: CharacterEntity): EntityRow {
  const roles = entity.roles.map((role) => role.id).join(', ');
  return {
    cells: {
      name: entity.token,
      roles: roles === '' ? EMPTY : roles,
    },
    id: entity.token,
    state: 'normal',
  };
}
