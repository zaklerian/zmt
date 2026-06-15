import { EntityFormDescriptor } from '@r-core';

// Host-side form-descriptor registry, keyed by (gameId, entityId). Separate
// from the read-side recognizer registry (ADR 018); the two share only the
// entity-identifier constant (entityId === the recognizer's id), which keeps
// read and write from drifting while letting them evolve independently.
export interface EntityFormRegistry {
  register: (descriptor: EntityFormDescriptor) => void;
  resolve: (gameId: string, entityId: string) => EntityFormDescriptor | null;
}

export function createEntityFormRegistry(): EntityFormRegistry {
  const descriptors = new Map<string, EntityFormDescriptor>();
  const keyOf = (gameId: string, entityId: string): string =>
    `${gameId}:${entityId}`;

  return {
    register: (descriptor) => {
      descriptors.set(
        keyOf(descriptor.gameId, descriptor.entityId),
        descriptor,
      );
    },
    resolve: (gameId, entityId) =>
      descriptors.get(keyOf(gameId, entityId)) ?? null,
  };
}

export const entityFormRegistry = createEntityFormRegistry();
