import type { ModId } from '@contracts';

import type { ResolvedFile } from '../resolution';

// The provenance of a resolved texture file. `sourceId` (the winning source path)
// and `modId`/`permission` answer "which source provides it — BICE or the readonly
// vanilla reference"; `relativePath`/`absolutePath` are the ACTUAL file on disk,
// which can differ from the requested path in extension or case (the `.tga`→`.dds`
// and case-insensitive matches the probe performs). `reason` and
// `shadowedSourceIds` mirror the file resolver's output for the single asset path.
export interface AssetProvenance {
  readonly absolutePath: string;
  readonly modId: ModId | null;
  readonly permission: 'editable' | 'readonly';
  readonly reason: ResolvedFile['reason'];
  readonly relativePath: string;
  readonly shadowedSourceIds: readonly string[];
  readonly sourceId: string;
}

// Resolution B (ZMT-39): turning a sprite's raw `texturefile` into the actual file
// on disk. This is stage-1 load-order resolution (ADR 016) over a single relative
// path — the same primitive geometry the entity index and the tech-tree geometry
// use — with NO stage 2 (a `.dds` has no inner entity to resolve). The messiness
// the BICE survey documents lives in the probe that feeds the resolver, not here:
// `.gfx` may reference `.tga` while a `.dds` ships, double-slashes and mixed case
// abound, and some refs resolve to nothing. So this is a two-outcome result, not
// an error channel — a missing asset is a clean `unresolved`, never a throw.
export type AssetResolution = AssetResolved | AssetUnresolved;

interface AssetResolved {
  readonly provenance: AssetProvenance;
  readonly requestedPath: string;
  readonly status: 'resolved';
}

interface AssetUnresolved {
  readonly requestedPath: string;
  readonly status: 'unresolved';
}
