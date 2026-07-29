import type { Script } from '@paradox-parser';

// One entity type's contribution to the source-scoped index registry (ADR 024
// decision 2). `folder` is the directory enumerated across sources (the single
// home for the type's file location — L-014's enumeration-side close). `extract`
// is the existing per-entity extractor, unchanged. `identify` names an extracted
// entity, keying stage-2 same-name resolution (required by the ZMT-30 amendment;
// extractors return differently-shaped identities — module `name`, technology
// `token` — so the registry supplies the accessor). Lives in the game lib beside
// the extractors and folder consts it wires (ADR 010); the generic index that
// consumes it is main-side. `slimProjector` is NOT here: it lands with the
// `index:list`/`index:detail` channels next ticket, extending this additively
// (ADR 024 decision 4).
export interface EntityRegistryEntry<T> {
  readonly entityId: string;
  readonly extract: (script: Script) => readonly T[];
  readonly folder: string;
  readonly identify: (entity: T) => string;
}
