import type { ModId } from '../workspace';
import type { WriteKind } from './write-kind.const';

// A file new content is written to, addressed the way every other write in the app
// is: the owning mod plus a mod-relative path, never an absolute path from the
// renderer.
export interface WriteTarget {
  readonly modId: ModId;
  readonly relativePath: string;
}

// The `writeTargets` preference value (ADR 029 decision 4): the user's chosen save
// target per (mod, kind), as the mod-relative path only. The mod is the OUTER key,
// so a stored value can never carry a second `modId` that disagrees with the one
// the write already resolved to — the two halves reconstruct the `WriteTarget`.
//
// Both levels are `Partial`: a mod with no chosen targets has no entry, and a kind
// with no chosen target has none either. Missing means "fall back", never "no
// target" (decision 5).
export type WriteTargets = Readonly<
  Partial<Record<ModId, Readonly<Partial<Record<WriteKind, string>>>>>
>;
