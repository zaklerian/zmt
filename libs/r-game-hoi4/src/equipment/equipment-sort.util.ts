import { EquipmentEntity } from '@contracts';

// Localized domain text does not sort into the desired order, so precedence is
// encoded explicitly: classified air, then naval, then land, then unresolved,
// then invalid. Ties break by name.
export function compareEquipmentEntities(
  a: EquipmentEntity,
  b: EquipmentEntity,
): number {
  const byRank = domainRank(a) - domainRank(b);
  return byRank === 0 ? a.name.localeCompare(b.name) : byRank;
}

function domainRank(entity: EquipmentEntity): number {
  const { classification } = entity;
  if (classification.status === 'classified') {
    if (classification.domain === 'air') return 0;
    return classification.domain === 'naval' ? 1 : 2;
  }
  return classification.status === 'unresolved' ? 3 : 4;
}
