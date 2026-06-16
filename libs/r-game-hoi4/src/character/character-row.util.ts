import { CharacterEntity } from '@contracts';
import { EntityRow } from '@r-core';

const EMPTY = '—';

export function mapCharacterRow(entity: CharacterEntity): EntityRow {
  const roles = entity.roles.map((role) => role.id).join(', ');
  return {
    cells: {
      gender: entity.gender === '' ? EMPTY : entity.gender,
      name: entity.token,
      roles: roles === '' ? EMPTY : roles,
    },
    id: entity.token,
    state: 'normal',
  };
}
