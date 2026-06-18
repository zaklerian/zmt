import { StateEntity } from '@contracts';

// States order by numeric id when both ids parse as numbers (the natural state
// ordering); otherwise fall back to a stable locale compare on the raw id.
export function compareStateEntities(a: StateEntity, b: StateEntity): number {
  const aNum = Number(a.id);
  const bNum = Number(b.id);
  if (!Number.isNaN(aNum) && !Number.isNaN(bNum) && aNum !== bNum) {
    return aNum - bNum;
  }
  return a.id.localeCompare(b.id);
}
