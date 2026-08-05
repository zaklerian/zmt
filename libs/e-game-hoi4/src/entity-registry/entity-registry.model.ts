import type { Script } from '@paradox-parser';

// One entity type's contribution to the source-scoped index registry (ADR 024
// decision 2). `folder` is the directory enumerated across sources (the single
// home for the type's file location — L-014's enumeration-side close). `extract`
// is the existing per-entity extractor, unchanged. `identify` names an extracted
// entity, keying stage-2 same-name resolution (required by the ZMT-30 amendment;
// extractors return differently-shaped identities — module `name`, technology
// `token` — so the registry supplies the accessor). `slimProjector` projects one
// entity to its own slim shape for `index:list` (ADR 024 decision 4); each entity
// type projects a distinct `TSlim`, so the second type param keeps the row type
// honest per entity rather than collapsing to one shared shape. Lives in the game
// lib beside the extractors and folder consts it wires (ADR 010); the generic
// index that consumes it is main-side.
export interface EntityRegistryEntry<T, TSlim = unknown> {
  readonly entityId: string;
  // File extension of the type's declarations, defaulted to `.txt` by the
  // enumerator when omitted. Sprites ship as `.gfx` (ZMT-39); every other type
  // omits this and inherits `.txt`. The single home for the type's extension, the
  // extension-side analogue of `folder` being the single home for its location.
  readonly extension?: string;
  readonly extract: (script: Script) => readonly T[];
  readonly folder: string;
  readonly identify: (entity: T) => string;
  readonly slimProjector: (entity: T) => TSlim;
}
