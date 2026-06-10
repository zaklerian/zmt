import { EquipmentEntity } from '@contracts';
import { EntityRow, TranslateFn } from '@r-core';

const DOMAIN_KEY = {
  air: 'plugin.hoi4:equipment.domain.air',
  land: 'plugin.hoi4:equipment.domain.land',
  naval: 'plugin.hoi4:equipment.domain.naval',
} as const;

const EMPTY_TYPE = '—';

export function mapEquipmentRow(
  entity: EquipmentEntity,
  translate: TranslateFn,
): EntityRow {
  const { classification } = entity;

  if (classification.status === 'classified') {
    return {
      cells: {
        domain: translate(DOMAIN_KEY[classification.domain]),
        kind: entity.kind,
        name: entity.name,
        type: classification.type.join(', '),
      },
      id: entity.name,
      state: classification.domain === 'air' ? 'normal' : 'muted',
    };
  }

  const unresolved = classification.status === 'unresolved';
  return {
    cells: {
      domain: translate(
        unresolved
          ? 'plugin.hoi4:equipment.status.unresolved'
          : 'plugin.hoi4:equipment.status.invalid',
      ),
      kind: entity.kind,
      name: entity.name,
      type: EMPTY_TYPE,
    },
    id: entity.name,
    state: unresolved ? 'warning' : 'error',
  };
}
