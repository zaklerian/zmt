import type { EntityField } from '../entity';
import type { ModId } from '../workspace';

export interface EquipmentSlotsRequest {
  readonly entityName: string;
  readonly modId: ModId;
  readonly relativePath: string;
}

export interface EquipmentSlotsResult {
  readonly assignments: readonly EntityField[];
  readonly slots: readonly ModuleSlot[];
}

export interface ModuleSlot {
  readonly allowedCategories: readonly string[];
  readonly name: string;
  readonly required: boolean;
}
