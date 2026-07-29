import type { ModuleEntity, ModuleSlim } from '@contracts';

// The module `slimProjector` (ADR 024 decisions 4 + 6): the second projector, so
// the `slimProjector` contract is shaped by two entity types. A module's slim is
// its own equivalent of technology's — `id` is the resolution token (the module
// name), and the module carries a single `category`, not a plural `categories`.
export function projectModuleSlim(entity: ModuleEntity): ModuleSlim {
  return {
    category: entity.category,
    id: entity.name,
    name: entity.name,
  };
}
