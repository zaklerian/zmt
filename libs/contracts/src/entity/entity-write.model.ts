import type { ModId } from '../workspace';

export interface EntityDeleteRequest {
  readonly entityName: string;
  readonly modId: ModId;
  readonly relativePath: string;
}

export interface EntityField {
  readonly key: string;
  readonly value: string;
}

export interface EntityScalarDelta {
  readonly added: readonly EntityField[];
  readonly changed: readonly EntityField[];
  readonly removed: readonly string[];
}

export interface EntityWriteRequest {
  readonly delta: EntityScalarDelta;
  readonly entityName: string;
  readonly modId: ModId;
  readonly relativePath: string;
}
